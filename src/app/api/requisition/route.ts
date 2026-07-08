import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import {
  partsRequisition,
  partsRequisitionItems,
  partsMaster,
  inventory,
  jobCards,
  users,
  vehicles,
  stockTransactions,
  purchaseRequisition,
  purchaseRequisitionItems,
} from "@/db/schema";
import { eq, desc, and, sql, gt, lt } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "requisitions") {
    const requisitions = await db
      .select({
        id: partsRequisition.id,
        requisitionNumber: partsRequisition.requisitionNumber,
        status: partsRequisition.status,
        remarks: partsRequisition.remarks,
        requestedDate: partsRequisition.requestedDate,
        fulfilledDate: partsRequisition.fulfilledDate,
        jobCard: jobCards,
        vehicle: vehicles,
        requestedBy: users,
      })
      .from(partsRequisition)
      .leftJoin(jobCards, eq(partsRequisition.jobCardId, jobCards.id))
      .leftJoin(vehicles, eq(jobCards.vehicleId, vehicles.id))
      .leftJoin(users, eq(partsRequisition.requestedBy, users.id))
      .orderBy(desc(partsRequisition.createdAt))
      .limit(200);

    // Auto-detect: For each pending requisition, re-check stock availability
    const enriched = await Promise.all(
      requisitions.map(async (req) => {
        if (req.status === "pending") {
          const items = await db
            .select({
              id: partsRequisitionItems.id,
              partId: partsRequisitionItems.partId,
            })
            .from(partsRequisitionItems)
            .where(eq(partsRequisitionItems.requisitionId, req.id));

          let hasTransferable = false;
          for (const item of items) {
            const [inv] = await db
              .select({ qty: inventory.quantity })
              .from(inventory)
              .where(and(
                eq(inventory.partId, item.partId),
                eq(inventory.branchId, user.branchId || 1)
              ))
              .limit(1);

            if (inv && inv.qty > 0) {
              hasTransferable = true;
              break;
            }
          }
          return { ...req, hasStockNow: hasTransferable };
        }
        return { ...req, hasStockNow: false };
      })
    );

    return NextResponse.json({ requisitions: enriched });
  }

  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, ...data } = body;

  // STEP 1: Create parts requisition
  if (type === "parts-requisition") {
    const { jobCardId, items, remarks } = data;
    const now = new Date();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const requisitionNumber = `PRQ-${y}${m}-${rand}`;

    const [reqRecord] = await db
      .insert(partsRequisition)
      .values({
        requisitionNumber,
        jobCardId,
        requestedBy: user.id,
        status: "pending",
        remarks,
      })
      .returning();

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const inv = await db
          .select({ qty: inventory.quantity })
          .from(inventory)
          .where(and(eq(inventory.partId, item.partId), eq(inventory.branchId, user.branchId || 1)))
          .limit(1);

        const available = inv.length > 0 ? inv[0].qty : 0;
        const qtyNeeded = parseInt(item.quantity);

        await db.insert(partsRequisitionItems).values({
          requisitionId: reqRecord.id,
          partId: item.partId,
          quantityRequested: qtyNeeded,
          quantityAvailable: available,
          quantityIssued: 0,
          issued: false,
        });
      }
    }

    await db.update(jobCards).set({ status: "pending_parts", updatedAt: now }).where(eq(jobCards.id, jobCardId));

    return NextResponse.json({ success: true, requisition: reqRecord });
  }

  // STEP 2: Transfer to Procurement
  if (type === "transfer-to-procurement") {
    const { requisitionItemId, requisitionId, partId, requestedQty, reason } = data;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");

    await db
      .update(partsRequisitionItems)
      .set({ quantityAvailable: 0 })
      .where(eq(partsRequisitionItems.id, requisitionItemId));

    const prRand = Math.floor(Math.random() * 9000 + 1000);
    const prNumber = `PR-${y}${m}-${prRand}`;

    const [newPR] = await db
      .insert(purchaseRequisition)
      .values({
        prNumber,
        branchId: user.branchId || 1,
        requestedBy: user.id,
        status: "pending",
        priority: "high",
        remarks: `Transferred by Store from Job Req #${requisitionId}. Reason: ${reason || "Stock not available"}`,
      })
      .returning();

    await db.insert(purchaseRequisitionItems).values({
      prId: newPR.id,
      partId,
      quantity: requestedQty,
      estimatedPrice: null,
      vendorId: null,
    });

    const [part] = await db.select().from(partsMaster).where(eq(partsMaster.id, partId)).limit(1);

    return NextResponse.json({
      success: true,
      message: `Transferred to Procurement. PR #${prNumber} created.`,
      autoPR: { prNumber: newPR.prNumber, id: newPR.id, partName: part?.partName },
    });
  }

  // STEP 2b: Backward compat decline
  if (type === "decline-item") {
    return await handleTransfer(data, user);
  }

  // STEP 3: Issue parts
  if (type === "issue-parts") {
    const { requisitionId, items } = data;
    const now = new Date();

    for (const item of items) {
      const inv = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.partId, item.partId), eq(inventory.branchId, user.branchId || 1)))
        .limit(1);

      if (inv.length > 0 && inv[0].quantity >= item.quantityIssued) {
        await db
          .update(inventory)
          .set({ quantity: sql`${inventory.quantity} - ${item.quantityIssued}`, lastUpdated: now })
          .where(eq(inventory.id, inv[0].id));

        await db
          .update(partsRequisitionItems)
          .set({ quantityIssued: item.quantityIssued, issued: true })
          .where(eq(partsRequisitionItems.id, item.id));

        await db.insert(stockTransactions).values({
          partId: item.partId,
          branchId: user.branchId || 1,
          transactionType: "issue",
          quantity: -item.quantityIssued,
          referenceType: "parts_requisition",
          referenceId: requisitionId,
          performedBy: user.id,
          remarks: `Issued for requisition`,
        });
      } else {
        // Update available quantity for re-display
        await db
          .update(partsRequisitionItems)
          .set({ quantityAvailable: inv.length > 0 ? inv[0].quantity : 0 })
          .where(eq(partsRequisitionItems.id, item.id));
      }
    }

    // Check if all items issued
    const allItems = await db
      .select()
      .from(partsRequisitionItems)
      .where(eq(partsRequisitionItems.requisitionId, requisitionId));

    const allIssued = allItems.length > 0 && allItems.every((i) => i.issued);

    await db
      .update(partsRequisition)
      .set({ status: allIssued ? "fulfilled" : "pending", fulfilledDate: allIssued ? now : null })
      .where(eq(partsRequisition.id, requisitionId));

    if (allIssued) {
      const [req] = await db
        .select({ jobCardId: partsRequisition.jobCardId })
        .from(partsRequisition)
        .where(eq(partsRequisition.id, requisitionId))
        .limit(1);
      if (req) {
        await db.update(jobCards).set({ status: "in_progress", updatedAt: now }).where(eq(jobCards.id, req.jobCardId));
      }
    }

    return NextResponse.json({ success: true, allIssued });
  }

  // LUBRICATION
  if (type === "issue-lubrication") {
    const { partId, quantity, vehicleId, remarks } = data;
    const qty = parseInt(quantity);
    const now = new Date();

    const inv = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.partId, partId), eq(inventory.branchId, user.branchId || 1)))
      .limit(1);

    if (inv.length === 0) return NextResponse.json({ error: "No stock available" }, { status: 400 });
    if (inv[0].quantity < qty) return NextResponse.json({ error: `Only ${inv[0].quantity} liter available` }, { status: 400 });

    await db
      .update(inventory)
      .set({ quantity: sql`${inventory.quantity} - ${qty}`, lastUpdated: now })
      .where(eq(inventory.id, inv[0].id));

    await db.insert(stockTransactions).values({
      partId,
      branchId: user.branchId || 1,
      transactionType: "lubrication_issue",
      quantity: -qty,
      referenceType: "lubrication",
      referenceId: vehicleId ? parseInt(vehicleId) : null,
      performedBy: user.id,
      remarks: remarks || "Lubrication direct issue",
    });

    return NextResponse.json({ success: true, remainingStock: inv[0].quantity - qty });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

async function handleTransfer(data: any, user: any) {
  const { requisitionItemId, requisitionId, partId, requestedQty, reason } = data;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  await db
    .update(partsRequisitionItems)
    .set({ quantityAvailable: 0 })
    .where(eq(partsRequisitionItems.id, requisitionItemId));

  const prRand = Math.floor(Math.random() * 9000 + 1000);
  const prNumber = `PR-${y}${m}-${prRand}`;

  const [newPR] = await db
    .insert(purchaseRequisition)
    .values({
      prNumber,
      branchId: user.branchId || 1,
      requestedBy: user.id,
      status: "pending",
      priority: "high",
      remarks: `Auto-created from Job Req #${requisitionId}. ${reason || "Not in stock"}`,
    })
    .returning();

  await db.insert(purchaseRequisitionItems).values({
    prId: newPR.id,
    partId,
    quantity: requestedQty,
    estimatedPrice: null,
    vendorId: null,
  });

  const [part] = await db.select().from(partsMaster).where(eq(partsMaster.id, partId)).limit(1);

  return NextResponse.json({
    success: true,
    message: `Transferred to Procurement. PR #${prNumber} created.`,
    autoPR: { prNumber: newPR.prNumber, id: newPR.id, partName: part?.partName },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import {
  purchaseRequisition,
  purchaseRequisitionItems,
  purchaseOrders,
  purchaseOrderItems,
  partsMaster,
  vendors,
  users,
  branches,
  grn,
  grnItems,
  inventory,
  stockTransactions,
  partsRequisitionItems,
  debitVouchers,
  jobCards,
  vehicles as vehiclesTable,
} from "@/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  if (type === "purchase-requisitions") {
    const conditions: any[] = [];
    if (status) conditions.push(eq(purchaseRequisition.status, status as any));

    const prs = await db
      .select({
        id: purchaseRequisition.id,
        prNumber: purchaseRequisition.prNumber,
        status: purchaseRequisition.status,
        priority: purchaseRequisition.priority,
        remarks: purchaseRequisition.remarks,
        requestedDate: purchaseRequisition.requestedDate,
        approvedDate: purchaseRequisition.approvedDate,
        branch: branches,
        requestedBy: users,
      })
      .from(purchaseRequisition)
      .leftJoin(branches, eq(purchaseRequisition.branchId, branches.id))
      .leftJoin(users, eq(purchaseRequisition.requestedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseRequisition.createdAt))
      .limit(100);

    return NextResponse.json({ purchaseRequisitions: prs });
  }

  if (type === "pr-items") {
    const prId = parseInt(url.searchParams.get("prId") || "0");
    if (!prId) return NextResponse.json({ items: [] });

    const items = await db
      .select({
        id: purchaseRequisitionItems.id,
        partId: purchaseRequisitionItems.partId,
        quantity: purchaseRequisitionItems.quantity,
        estimatedPrice: purchaseRequisitionItems.estimatedPrice,
        part: partsMaster,
      })
      .from(purchaseRequisitionItems)
      .leftJoin(partsMaster, eq(purchaseRequisitionItems.partId, partsMaster.id))
      .where(eq(purchaseRequisitionItems.prId, prId));

    return NextResponse.json({ items });
  }

  if (type === "purchase-orders") {
    const pos = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        orderDate: purchaseOrders.orderDate,
        expectedDelivery: purchaseOrders.expectedDelivery,
        prId: purchaseOrders.prId,
        vendor: vendors,
        branch: branches,
        createdBy: users,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(100);

    return NextResponse.json({ purchaseOrders: pos });
  }

  if (type === "po-items") {
    const poId = parseInt(url.searchParams.get("poId") || "0");
    if (!poId) return NextResponse.json({ items: [] });

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        partId: purchaseOrderItems.partId,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitPrice: purchaseOrderItems.unitPrice,
        part: partsMaster,
      })
      .from(purchaseOrderItems)
      .leftJoin(partsMaster, eq(purchaseOrderItems.partId, partsMaster.id))
      .where(eq(purchaseOrderItems.poId, poId));

    return NextResponse.json({ items });
  }

  if (type === "purchase-records") {
    // Combined PO + PR + GRN + Items + Vehicle record
    const pos = await db
      .select({
        poId: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        poStatus: purchaseOrders.status,
        poCreated: purchaseOrders.orderDate,
        prId: purchaseOrders.prId,
        vendorName: vendors.name,
        totalAmount: purchaseOrders.totalAmount,
        branchName: branches.name,
        poRemarks: purchaseOrders.remarks,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .orderBy(desc(purchaseOrders.orderDate))
      .limit(500);

    const records = await Promise.all(
      pos.map(async (po) => {
        // Get items
        const items = await db
          .select({
            partNumber: partsMaster.partNumber,
            partName: partsMaster.partName,
            quantity: purchaseOrderItems.quantity,
            unitPrice: purchaseOrderItems.unitPrice,
            receivedQuantity: purchaseOrderItems.receivedQuantity,
          })
          .from(purchaseOrderItems)
          .leftJoin(partsMaster, eq(purchaseOrderItems.partId, partsMaster.id))
          .where(eq(purchaseOrderItems.poId, po.poId));

        // Get PR number and vehicle
        let prNumber: string | undefined;
        let vehicleNumber: string | undefined;
        if (po.prId) {
          const [pr] = await db
            .select({
              prNumber: purchaseRequisition.prNumber,
              remarks: purchaseRequisition.remarks,
            })
            .from(purchaseRequisition)
            .where(eq(purchaseRequisition.id, po.prId))
            .limit(1);
          prNumber = pr?.prNumber ?? undefined;
          if (pr?.remarks) {
            const m = pr.remarks.match(/(JC-\S+)/);
            if (m) {
              const [jobCard] = await db
                .select({ reg: vehiclesTable.registrationNumber })
                .from(jobCards)
                .leftJoin(vehiclesTable, eq(jobCards.vehicleId, vehiclesTable.id))
                .where(eq(jobCards.jobCardNumber, m[1]))
                .limit(1);
              vehicleNumber = jobCard?.reg ?? undefined;
            }
          }
        }

        // Get GRN
        const [grnRec] = await db
          .select({
            grnNumber: grn.grnNumber,
            receivedDate: grn.receivedDate,
            receivedBy: users,
          })
          .from(grn)
          .leftJoin(users, eq(grn.receivedBy, users.id))
          .where(eq(grn.poId, po.poId))
          .limit(1);

        return {
          ...po,
          totalAmount: Number(po.totalAmount || 0),
          items: items.map((i) => ({
            ...i,
            unitPrice: Number(i.unitPrice || 0),
          })),
          prNumber,
          vehicleNumber,
          grnNumber: grnRec?.grnNumber,
          grnDate: grnRec?.receivedDate,
          receivedBy: grnRec?.receivedBy?.fullName,
        };
      })
    );

    return NextResponse.json({ records });
  }

  if (type === "grn") {
    const grns = await db
      .select({
        id: grn.id,
        grnNumber: grn.grnNumber,
        receivedDate: grn.receivedDate,
        remarks: grn.remarks,
        po: purchaseOrders,
        vendor: vendors,
        receivedBy: users,
      })
      .from(grn)
      .leftJoin(purchaseOrders, eq(grn.poId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(grn.receivedBy, users.id))
      .orderBy(desc(grn.createdAt))
      .limit(100);

    return NextResponse.json({ grn: grns });
  }

  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, ...data } = body;

  // Create Purchase Requisition (no approval needed - procurement handles directly)
  if (type === "purchase-requisition") {
    const { branchId, remarks, priority, items } = data;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const prRand = Math.floor(Math.random() * 9000 + 1000);
    const prNumber = `PR-${y}${m}-${prRand}`;

    const [pr] = await db
      .insert(purchaseRequisition)
      .values({
        prNumber,
        branchId: branchId || user.branchId || 1,
        requestedBy: user.id,
        status: "pending",
        priority: priority || "medium",
        remarks: remarks || null,
      })
      .returning();

    if (items && Array.isArray(items) && items.length > 0) {
      await db.insert(purchaseRequisitionItems).values(
        items.map((item: any) => ({
          prId: pr.id,
          partId: item.partId,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice || null,
          vendorId: item.vendorId || null,
        }))
      );
    }

    return NextResponse.json({ success: true, pr });
  }

  // Create Purchase Order (with PR linking)
  if (type === "purchase-order") {
    const { prId, vendorId, branchId, items, expectedDelivery, remarks } = data;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const poNumber = `PO-${y}${m}-${rand}`;

    const totalAmount = items?.reduce(
      (sum: number, item: any) => sum + (Number(item.unitPrice) * item.quantity),
      0
    ) || 0;

    const [po] = await db
      .insert(purchaseOrders)
      .values({
        poNumber,
        prId: prId || null,
        vendorId,
        branchId: branchId || user.branchId || 1,
        createdBy: user.id,
        status: "ordered",
        totalAmount: String(totalAmount),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        remarks: remarks || "",
      })
      .returning();

    if (items && Array.isArray(items) && items.length > 0) {
      await db.insert(purchaseOrderItems).values(
        items.map((item: any) => ({
          poId: po.id,
          partId: item.partId,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          receivedQuantity: 0,
        }))
      );
    }

    // Auto-update linked PR status to fulfilled
    if (prId) {
      await db
        .update(purchaseRequisition)
        .set({ status: "fulfilled", approvedDate: now })
        .where(eq(purchaseRequisition.id, prId));
    }

    // Auto-create Debit Voucher for Accountant
    const voucherRand = Math.floor(Math.random() * 90000 + 10000);
    const voucherNumber = `DV-${y}${m}-${voucherRand}`;
    const [voucher] = await db
      .insert(debitVouchers)
      .values({
        voucherNumber,
        poId: po.id,
        vendorId,
        amount: String(totalAmount),
        description: `Auto-generated from ${po.poNumber} (${vendors ? "vendor" : "purchase"})`,
        status: "pending",
        paidAmount: "0",
        remarks: `PO: ${po.poNumber} | PR: ${prId || "N/A"}`,
      })
      .returning();

    return NextResponse.json({ success: true, po, voucher });
  }

  // GRN (Goods Receipt)
  if (type === "grn") {
    const { poId, items } = data;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const grnNumber = `GRN-${y}${m}-${rand}`;

    const [grnRecord] = await db
      .insert(grn)
      .values({ grnNumber, poId, receivedBy: user.id })
      .returning();

    if (items && Array.isArray(items) && items.length > 0) {
      await db.insert(grnItems).values(
        items.map((item: any) => ({
          grnId: grnRecord.id,
          poItemId: item.poItemId,
          partId: item.partId,
          quantityReceived: item.quantityReceived,
        }))
      );

      // Update inventory
      for (const item of items) {
        const [existingInv] = await db
          .select()
          .from(inventory)
          .where(and(
            eq(inventory.partId, item.partId),
            eq(inventory.branchId, user.branchId || 1)
          ))
          .limit(1);

        if (existingInv) {
          await db
            .update(inventory)
            .set({
              quantity: sql`${inventory.quantity} + ${item.quantityReceived}`,
              lastUpdated: now,
            })
            .where(eq(inventory.id, existingInv.id));
        } else {
          await db.insert(inventory).values({
            partId: item.partId,
            branchId: user.branchId || 1,
            quantity: item.quantityReceived,
            reservedQuantity: 0,
          });
        }

        await db.insert(stockTransactions).values({
          partId: item.partId,
          branchId: user.branchId || 1,
          transactionType: "grn_receipt",
          quantity: item.quantityReceived,
          referenceType: "grn",
          referenceId: grnRecord.id,
          performedBy: user.id,
          remarks: `GRN ${grnNumber}`,
        });

        await db
          .update(purchaseOrderItems)
          .set({
            receivedQuantity: sql`${purchaseOrderItems.receivedQuantity} + ${item.quantityReceived}`,
          })
          .where(eq(purchaseOrderItems.id, item.poItemId));
      }

      // Update PO status
      const poItems = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.poId, poId));

      const allReceived = poItems.every((i) => (i.receivedQuantity ?? 0) >= i.quantity);
      const someReceived = poItems.some((i) => (i.receivedQuantity ?? 0) > 0);

      await db
        .update(purchaseOrders)
        .set({
          status: allReceived ? "completed" : someReceived ? "partial_received" : "ordered",
          updatedAt: now,
        })
        .where(eq(purchaseOrders.id, poId));

      // Auto-recheck pending requisitions — if stock now available, update quantityAvailable
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
      if (po && po.prId) {
        // Find the related PR items
        const prItemsList = await db
          .select()
          .from(purchaseRequisitionItems)
          .where(eq(purchaseRequisitionItems.prId, po.prId));

        for (const prItem of prItemsList) {
          const [inv] = await db
            .select({ qty: inventory.quantity })
            .from(inventory)
            .where(and(eq(inventory.partId, prItem.partId), eq(inventory.branchId, po.branchId)))
            .limit(1);

          if (inv && inv.qty > 0) {
            // Find related parts requisition items and update their quantityAvailable
            // We link via partId and look for non-issued, non-fully-issued items
            const reqItems = await db
              .select()
              .from(partsRequisitionItems)
              .where(and(
                eq(partsRequisitionItems.partId, prItem.partId),
                eq(partsRequisitionItems.issued, false)
              ));

            for (const ri of reqItems) {
              await db
                .update(partsRequisitionItems)
                .set({ quantityAvailable: inv.qty })
                .where(eq(partsRequisitionItems.id, ri.id));
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, grn: grnRecord });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { purchaseRequisition, purchaseRequisitionItems, partsMaster, jobCards, partsRequisition, partsRequisitionItems, users, vehicles, stockTransactions, inventory, purchaseOrders, purchaseOrderItems, vendors, grn, grnItems, branches } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "pending-job-approvals") {
    // Pending parts requisitions waiting for manager approval
    const pending = await db
      .select({
        id: partsRequisition.id,
        requisitionNumber: partsRequisition.requisitionNumber,
        status: partsRequisition.status,
        remarks: partsRequisition.remarks,
        requestedDate: partsRequisition.requestedDate,
        jobCard: jobCards,
        vehicle: vehicles,
        requestedBy: users,
      })
      .from(partsRequisition)
      .leftJoin(jobCards, eq(partsRequisition.jobCardId, jobCards.id))
      .leftJoin(vehicles, eq(jobCards.vehicleId, vehicles.id))
      .leftJoin(users, eq(partsRequisition.requestedBy, users.id))
      .where(eq(partsRequisition.status, "pending"))
      .orderBy(desc(partsRequisition.requestedDate))
      .limit(100);

    // Get items for each
    const withItems = await Promise.all(
      pending.map(async (p) => {
        const items = await db
          .select({
            id: partsRequisitionItems.id,
            partId: partsRequisitionItems.partId,
            quantityRequested: partsRequisitionItems.quantityRequested,
            quantityAvailable: partsRequisitionItems.quantityAvailable,
            issued: partsRequisitionItems.issued,
            part: partsMaster,
          })
          .from(partsRequisitionItems)
          .leftJoin(partsMaster, eq(partsRequisitionItems.partId, partsMaster.id))
          .where(eq(partsRequisitionItems.requisitionId, p.id));
        return { ...p, items };
      })
    );

    return NextResponse.json({ requisitions: withItems });
  }

  if (type === "pending-pr-approvals") {
    const pending = await db
      .select({
        id: purchaseRequisition.id,
        prNumber: purchaseRequisition.prNumber,
        status: purchaseRequisition.status,
        priority: purchaseRequisition.priority,
        remarks: purchaseRequisition.remarks,
        requestedDate: purchaseRequisition.requestedDate,
        branch: branches,
        requestedBy: users,
      })
      .from(purchaseRequisition)
      .leftJoin(branches, eq(purchaseRequisition.branchId, branches.id))
      .leftJoin(users, eq(purchaseRequisition.requestedBy, users.id))
      .where(eq(purchaseRequisition.status, "pending"))
      .orderBy(desc(purchaseRequisition.requestedDate))
      .limit(100);

    const withItems = await Promise.all(
      pending.map(async (p) => {
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
          .where(eq(purchaseRequisitionItems.prId, p.id));
        return { ...p, items };
      })
    );

    return NextResponse.json({ purchaseRequisitions: withItems });
  }

  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((user.role as string) !== "fleet_manager") {
    return NextResponse.json({ error: "Only Fleet Manager can approve" }, { status: 403 });
  }

  const body = await req.json();
  const { type, id, action } = body;

  if (type === "parts-requisition") {
    if (action === "approve") {
      await db.update(partsRequisition).set({ status: "approved" }).where(eq(partsRequisition.id, id));
      return NextResponse.json({ success: true });
    }
    if (action === "reject") {
      await db.update(partsRequisition).set({ status: "rejected" }).where(eq(partsRequisition.id, id));
      return NextResponse.json({ success: true });
    }
  }

  if (type === "purchase-requisition") {
    if (action === "approve") {
      await db.update(purchaseRequisition).set({ status: "approved", approvedDate: new Date() }).where(eq(purchaseRequisition.id, id));
      return NextResponse.json({ success: true });
    }
    if (action === "reject") {
      await db.update(purchaseRequisition).set({ status: "rejected", approvedDate: new Date() }).where(eq(purchaseRequisition.id, id));
      return NextResponse.json({ success: true });
    }
  }

  if (type === "convert-pr-to-po") {
    // Procurement executive converts approved PR to PO
    const { prId, vendorId, expectedDelivery, remarks } = body;
    if ((user.role as string) !== "procurement_executive") {
      return NextResponse.json({ error: "Only procurement can create PO" }, { status: 403 });
    }

    const [pr] = await db.select().from(purchaseRequisition).where(eq(purchaseRequisition.id, prId)).limit(1);
    if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

    const items = await db
      .select()
      .from(purchaseRequisitionItems)
      .where(eq(purchaseRequisitionItems.prId, prId));

    if (items.length === 0) return NextResponse.json({ error: "No items in PR" }, { status: 400 });

    const now = new Date();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const poNumber = `PO-${y}${m}-${rand}`;

    const totalAmount = items.reduce(
      (sum, item) => sum + (Number(item.estimatedPrice || 0) * item.quantity),
      0
    );

    const [po] = await db
      .insert(purchaseOrders)
      .values({
        poNumber,
        prId,
        vendorId,
        branchId: pr.branchId,
        createdBy: user.id,
        status: "ordered",
        totalAmount: String(totalAmount),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        remarks: remarks || "",
      })
      .returning();

    // Default unit price 100 if not specified (or use estimated price)
    for (const item of items) {
      const unitPrice = item.estimatedPrice || "100";
      await db.insert(purchaseOrderItems).values({
        poId: po.id,
        partId: item.partId,
        quantity: item.quantity,
        unitPrice,
        receivedQuantity: 0,
      });
    }

    await db.update(purchaseRequisition).set({ status: "fulfilled" }).where(eq(purchaseRequisition.id, prId));

    return NextResponse.json({ success: true, po });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

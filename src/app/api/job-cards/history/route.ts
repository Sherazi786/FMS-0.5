import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import {
  partsRequisition,
  partsRequisitionItems,
  partsMaster,
  purchaseRequisition,
  purchaseRequisitionItems,
  purchaseOrders as poTable,
  vendors,
  grn,
  users,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const jobCardId = parseInt(url.searchParams.get("id") || "0");
  if (!jobCardId) return NextResponse.json({ error: "Job Card ID required" }, { status: 400 });

  // 1. Get parts requisitions for this job card
  const reqs = await db
    .select()
    .from(partsRequisition)
    .where(eq(partsRequisition.jobCardId, jobCardId))
    .orderBy(desc(partsRequisition.createdAt));

  const requisitions = await Promise.all(
    reqs.map(async (req) => {
      const items = await db
        .select({
          id: partsRequisitionItems.id,
          partId: partsRequisitionItems.partId,
          quantityRequested: partsRequisitionItems.quantityRequested,
          quantityAvailable: partsRequisitionItems.quantityAvailable,
          quantityIssued: partsRequisitionItems.quantityIssued,
          issued: partsRequisitionItems.issued,
          part: partsMaster,
        })
        .from(partsRequisitionItems)
        .leftJoin(partsMaster, eq(partsRequisitionItems.partId, partsMaster.id))
        .where(eq(partsRequisitionItems.requisitionId, req.id));
      return { ...req, items };
    })
  );

  // 2. Get auto-created PRs (filtered by remarks containing req number)
  const jobReqNumbers = requisitions.map((r) => r.requisitionNumber);
  const allPRs = await db.select().from(purchaseRequisition).orderBy(desc(purchaseRequisition.createdAt));
  const relatedPRs = allPRs.filter((p) => jobReqNumbers.some((reqNum) => p.remarks?.includes(reqNum)));

  const purchaseRequisitions = await Promise.all(
    relatedPRs.map(async (pr) => {
      const items = await db
        .select({
          id: purchaseRequisitionItems.id,
          partId: purchaseRequisitionItems.partId,
          quantity: purchaseRequisitionItems.quantity,
          part: partsMaster,
        })
        .from(purchaseRequisitionItems)
        .leftJoin(partsMaster, eq(purchaseRequisitionItems.partId, partsMaster.id))
        .where(eq(purchaseRequisitionItems.prId, pr.id));
      return { ...pr, items };
    })
  );

  // 3. Get POs for these PRs
  const prIds = purchaseRequisitions.map((p) => p.id);
  const posList: any[] = prIds.length > 0
    ? await db
        .select({
          id: poTable.id,
          poNumber: poTable.poNumber,
          prId: poTable.prId,
          status: poTable.status,
          totalAmount: poTable.totalAmount,
          vendor: vendors,
        })
        .from(poTable)
        .leftJoin(vendors, eq(poTable.vendorId, vendors.id))
        .where(inArray(poTable.prId, prIds))
    : [];

  // 4. Get GRNs for these POs
  const poIds = posList.map((p) => p.id);
  const grnsList: any[] = poIds.length > 0
    ? await db
        .select({
          id: grn.id,
          grnNumber: grn.grnNumber,
          poId: grn.poId,
          receivedDate: grn.receivedDate,
          receivedBy: users,
        })
        .from(grn)
        .leftJoin(users, eq(grn.receivedBy, users.id))
        .where(inArray(grn.poId, poIds))
    : [];

  return NextResponse.json({
    requisitions,
    purchaseRequisitions,
    purchaseOrders: posList,
    grns: grnsList,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { partsRequisitionItems, partsMaster } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const requisitionId = url.searchParams.get("requisitionId");

  if (!requisitionId) return NextResponse.json({ error: "requisitionId required" }, { status: 400 });

  const items = await db
    .select({
      id: partsRequisitionItems.id,
      partId: partsRequisitionItems.partId,
      quantityRequested: partsRequisitionItems.quantityRequested,
      quantityAvailable: partsRequisitionItems.quantityAvailable,
      quantityIssued: partsRequisitionItems.quantityIssued,
      issued: partsRequisitionItems.issued,
      partsMaster,
    })
    .from(partsRequisitionItems)
    .leftJoin(partsMaster, eq(partsRequisitionItems.partId, partsMaster.id))
    .where(eq(partsRequisitionItems.requisitionId, parseInt(requisitionId)));

  return NextResponse.json({ items });
}

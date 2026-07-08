import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { stockTransactions, partsMaster, users, vehicles } from "@/db/schema";
import { eq, desc, or, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get lubrication part IDs
  const lubParts = await db
    .select({ id: partsMaster.id })
    .from(partsMaster)
    .where(eq(partsMaster.category, "Lubrication"));

  const partIds = lubParts.map((p) => p.id);
  if (partIds.length === 0) {
    return NextResponse.json({ transactions: [] });
  }

  const transactions = await db
    .select({
      id: stockTransactions.id,
      partId: stockTransactions.partId,
      transactionType: stockTransactions.transactionType,
      quantity: stockTransactions.quantity,
      remarks: stockTransactions.remarks,
      createdAt: stockTransactions.createdAt,
      part: partsMaster,
      vehicle: vehicles,
      performedBy: users,
    })
    .from(stockTransactions)
    .leftJoin(partsMaster, eq(stockTransactions.partId, partsMaster.id))
    .leftJoin(vehicles, eq(stockTransactions.referenceId, vehicles.id))
    .leftJoin(users, eq(stockTransactions.performedBy, users.id))
    .where(inArray(stockTransactions.partId, partIds))
    .orderBy(desc(stockTransactions.createdAt))
    .limit(100);

  return NextResponse.json({ transactions });
}

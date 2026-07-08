import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { inventory, partsMaster, branches, stockTransactions } from "@/db/schema";
import { eq, like, or, and, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId");
  const search = url.searchParams.get("search") || "";
  const lowStock = url.searchParams.get("lowStock") === "true";
  const allParts = url.searchParams.get("allParts") === "true";

  if (allParts) {
    // Return all parts master with current stock info
    const items = await db
      .select({
        id: partsMaster.id,
        partNumber: partsMaster.partNumber,
        partName: partsMaster.partName,
        description: partsMaster.description,
        category: partsMaster.category,
        unit: partsMaster.unit,
        minStockLevel: partsMaster.minStockLevel,
      })
      .from(partsMaster)
      .where(search ? or(like(partsMaster.partNumber, `%${search}%`), like(partsMaster.partName, `%${search}%`))! : undefined)
      .limit(500);
    return NextResponse.json({ parts: items });
  }

  const conditions = [];
  if (branchId) conditions.push(eq(inventory.branchId, parseInt(branchId)));
  if (user.role === "store_executive" && user.branchId) conditions.push(eq(inventory.branchId, user.branchId));
  if (search) conditions.push(or(like(partsMaster.partNumber, `%${search}%`), like(partsMaster.partName, `%${search}%`))!);
  if (lowStock) conditions.push(sql`${inventory.quantity} <= ${partsMaster.minStockLevel}`);

  const items = await db
    .select({ id: inventory.id, quantity: inventory.quantity, reservedQuantity: inventory.reservedQuantity, lastUpdated: inventory.lastUpdated, part: partsMaster, branch: branches })
    .from(inventory)
    .leftJoin(partsMaster, eq(inventory.partId, partsMaster.id))
    .leftJoin(branches, eq(inventory.branchId, branches.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(200);

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((user.role as string) === "accountant") {
    return NextResponse.json({ error: "Accountant has read-only access" }, { status: 403 });
  }

  const body = await req.json();
  const { type, ...data } = body;

  if (type === "add-part") {
    const { partNumber, partName, description, category, unit, minStockLevel, branchId, initialStock } = data;

    if (!partNumber || !partName) {
      return NextResponse.json({ error: "Part number and name required" }, { status: 400 });
    }

    // Convert types safely
    const branch = parseInt(branchId) || user.branchId || 1;
    const qty = parseInt(initialStock) || 0;
    const minLevel = parseInt(minStockLevel) || 5;

    // Check if part already exists
    const [existingPart] = await db
      .select()
      .from(partsMaster)
      .where(eq(partsMaster.partNumber, partNumber))
      .limit(1);

    let partId: number;
    if (existingPart) {
      partId = existingPart.id;
    } else {
      const [p] = await db.insert(partsMaster).values({
        partNumber, partName, description: description || null,
        category: category || null, unit: unit || "piece",
        minStockLevel: minStockLevel || 5,
      }).returning();
      partId = p.id;
    }

    // Add to inventory
    const [existingInv] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.partId, partId), eq(inventory.branchId, branch)))
      .limit(1);

    if (existingInv) {
      await db.update(inventory)
        .set({ quantity: sql`${inventory.quantity} + ${qty}`, lastUpdated: new Date() })
        .where(eq(inventory.id, existingInv.id));
    } else {
      await db.insert(inventory).values({ partId, branchId: branch, quantity: qty, reservedQuantity: 0 });
    }

    if (qty > 0) {
      await db.insert(stockTransactions).values({
        partId, branchId: branch, transactionType: "manual_add",
        quantity: qty, referenceType: "manual", remarks: "Manually added to stock",
        performedBy: user.id,
      });
    }

    return NextResponse.json({ success: true, partId });
  }

  if (type === "add-stock") {
    const { partId, quantity, branchId } = data;
    if (!partId || !quantity) return NextResponse.json({ error: "Part ID and quantity required" }, { status: 400 });

    const branch = branchId || user.branchId || 1;
    const qty = parseInt(quantity);

    const [existingInv] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.partId, partId), eq(inventory.branchId, branch)))
      .limit(1);

    if (existingInv) {
      await db.update(inventory)
        .set({ quantity: sql`${inventory.quantity} + ${qty}`, lastUpdated: new Date() })
        .where(eq(inventory.id, existingInv.id));
    } else {
      await db.insert(inventory).values({ partId, branchId: branch, quantity: qty, reservedQuantity: 0 });
    }

    await db.insert(stockTransactions).values({
      partId, branchId: branch, transactionType: "stock_add",
      quantity: qty, referenceType: "manual", remarks: "Manual stock addition",
      performedBy: user.id,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

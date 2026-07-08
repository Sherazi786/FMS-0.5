import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { debitVouchers, purchaseOrders, vendors, users, grn, purchaseRequisition, partsMaster, purchaseOrderItems, branches, customStaff } from "@/db/schema";
import { eq, desc, and, sql, inArray, or, like } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search") || "";

  if (type === "vouchers") {
    const conditions: any[] = [];
    if (search) {
      conditions.push(or(
        like(debitVouchers.voucherNumber, `%${search}%`),
        like(vendors.name, `%${search}%`),
        like(purchaseOrders.poNumber, `%${search}%`)
      )!);
    }

    const vouchers = await db
      .select({
        id: debitVouchers.id,
        voucherNumber: debitVouchers.voucherNumber,
        poId: debitVouchers.poId,
        vendorId: debitVouchers.vendorId,
        amount: debitVouchers.amount,
        description: debitVouchers.description,
        status: debitVouchers.status,
        paidAmount: debitVouchers.paidAmount,
        paidDate: debitVouchers.paidDate,
        paidBy: debitVouchers.paidBy,
        paymentMethod: debitVouchers.paymentMethod,
        paymentReference: debitVouchers.paymentReference,
        remarks: debitVouchers.remarks,
        createdAt: debitVouchers.createdAt,
        po: purchaseOrders,
        vendor: vendors,
        paidByUser: users,
      })
      .from(debitVouchers)
      .leftJoin(purchaseOrders, eq(debitVouchers.poId, purchaseOrders.id))
      .leftJoin(vendors, eq(debitVouchers.vendorId, vendors.id))
      .leftJoin(users, eq(debitVouchers.paidBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(debitVouchers.createdAt))
      .limit(200);

    return NextResponse.json({ vouchers });
  }

  if (type === "staff") {
    const staff = await db
      .select({
        id: customStaff.id,
        name: customStaff.name,
        designation: customStaff.designation,
        phone: customStaff.phone,
        email: customStaff.email,
        status: customStaff.status,
        branch: branches,
      })
      .from(customStaff)
      .leftJoin(branches, eq(customStaff.branchId, branches.id))
      .orderBy(desc(customStaff.createdAt))
      .limit(200);
    return NextResponse.json({ staff });
  }

  if (type === "voucher-detail") {
    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const [voucher] = await db
      .select({
        id: debitVouchers.id,
        voucherNumber: debitVouchers.voucherNumber,
        amount: debitVouchers.amount,
        status: debitVouchers.status,
        paidAmount: debitVouchers.paidAmount,
        paidDate: debitVouchers.paidDate,
        paymentMethod: debitVouchers.paymentMethod,
        paymentReference: debitVouchers.paymentReference,
        createdAt: debitVouchers.createdAt,
        po: purchaseOrders,
        vendor: vendors,
        paidByUser: users,
        grn: grn,
      })
      .from(debitVouchers)
      .leftJoin(purchaseOrders, eq(debitVouchers.poId, purchaseOrders.id))
      .leftJoin(vendors, eq(debitVouchers.vendorId, vendors.id))
      .leftJoin(users, eq(debitVouchers.paidBy, users.id))
      .leftJoin(grn, eq(purchaseOrders.id, grn.poId))
      .where(eq(debitVouchers.id, id))
      .limit(1);

    if (!voucher) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get items
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        partId: purchaseOrderItems.partId,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        part: partsMaster,
      })
      .from(purchaseOrderItems)
      .leftJoin(partsMaster, eq(purchaseOrderItems.partId, partsMaster.id))
      .where(eq(purchaseOrderItems.poId, voucher.po?.id || 0));

    return NextResponse.json({ voucher, items });
  }

  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, ...data } = body;

  if (type === "mark-paid") {
    const { voucherId, amount, paymentMethod, paymentReference, remarks } = data;
    if (!voucherId || !amount) return NextResponse.json({ error: "voucherId and amount required" }, { status: 400 });

    const [voucher] = await db.select().from(debitVouchers).where(eq(debitVouchers.id, voucherId)).limit(1);
    if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const totalAmount = Number(voucher.amount);
    const currentPaid = Number(voucher.paidAmount || 0);
    const newPaid = currentPaid + Number(amount);
    const newStatus = newPaid >= totalAmount ? "paid" : "partial";

    await db
      .update(debitVouchers)
      .set({
        paidAmount: String(newPaid),
        paidDate: new Date(),
        paidBy: user.id,
        paymentMethod: paymentMethod || "cash",
        paymentReference: paymentReference || null,
        status: newStatus,
        remarks: remarks || voucher.remarks,
        updatedAt: new Date(),
      })
      .where(eq(debitVouchers.id, voucherId));

    return NextResponse.json({ success: true, newStatus, totalPaid: newPaid });
  }

  if (type === "add-staff") {
    if ((user.role as string) === "accountant") {
      return NextResponse.json({ error: "Accountant has read-only access" }, { status: 403 });
    }
    const { name, designation, phone, email, branchId } = data;
    if (!name || !designation) return NextResponse.json({ error: "Name and designation required" }, { status: 400 });

    const [s] = await db
      .insert(customStaff)
      .values({
        name,
        designation,
        phone: phone || null,
        email: email || null,
        branchId: branchId || null,
        createdBy: user.id,
        status: "active",
      })
      .returning();

    return NextResponse.json({ success: true, staff: s });
  }

  if (type === "delete-staff") {
    const id = parseInt(data.id || "0");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.update(customStaff).set({ status: "inactive" }).where(eq(customStaff.id, id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

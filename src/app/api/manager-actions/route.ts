import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import {
  customStaff,
  mechanics,
  vendors,
  vehicles,
  users,
  partsMaster,
  inventory,
  branches,
  debitVouchers,
  purchaseOrders,
  grn,
  jobCards,
  partsRequisition,
  partsRequisitionItems,
  stockTransactions,
  purchaseRequisition,
  purchaseRequisitionItems,
  grnItems,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((user.role as string) !== "fleet_manager") {
    return NextResponse.json({ error: "Only Fleet Manager can perform this action" }, { status: 403 });
  }

  if ((user.role as string) === "accountant") {
    return NextResponse.json({ error: "Accountant has read-only access" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = parseInt(url.searchParams.get("id") || "0");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    switch (type) {
      case "staff":
        await db.update(customStaff).set({ status: "inactive" }).where(eq(customStaff.id, id));
        return NextResponse.json({ success: true, message: "Staff removed" });

      case "mechanic":
        await db.update(mechanics).set({ status: "inactive" }).where(eq(mechanics.id, id));
        return NextResponse.json({ success: true, message: "Mechanic removed" });

      case "vehicle":
        await db.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
        return NextResponse.json({ success: true, message: "Vehicle removed" });

      case "vendor":
        const [poCheck] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorId, id)).limit(1);
        if (poCheck) {
          await db.update(vendors).set({ status: "inactive" }).where(eq(vendors.id, id));
          return NextResponse.json({ success: true, message: "Vendor marked inactive (has history)" });
        }
        await db.delete(vendors).where(eq(vendors.id, id));
        return NextResponse.json({ success: true, message: "Vendor removed" });

      case "part":
        await db.delete(inventory).where(eq(inventory.partId, id));
        await db.delete(partsMaster).where(eq(partsMaster.id, id));
        return NextResponse.json({ success: true, message: "Part removed" });

      case "branch":
        const [uCheck] = await db.select().from(users).where(eq(users.branchId, id)).limit(1);
        if (uCheck) {
          return NextResponse.json({ error: "Cannot delete branch with users" }, { status: 400 });
        }
        await db.delete(branches).where(eq(branches.id, id));
        return NextResponse.json({ success: true, message: "Branch removed" });

      case "user":
        if (id === user.id) {
          return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }
        await db.update(users).set({ status: "inactive" }).where(eq(users.id, id));
        return NextResponse.json({ success: true, message: "User deactivated" });

      case "voucher":
        await db.delete(debitVouchers).where(eq(debitVouchers.id, id));
        return NextResponse.json({ success: true, message: "Voucher deleted" });

      case "job-card":
        // Hard delete job card with cascade delete
        // First get all requisition IDs for this job card
        const reqs = await db
          .select({ id: partsRequisition.id })
          .from(partsRequisition)
          .where(eq(partsRequisition.jobCardId, id));
        // Delete requisition items
        for (const r of reqs) {
          await db.delete(partsRequisitionItems).where(eq(partsRequisitionItems.requisitionId, r.id));
        }
        // Delete requisitions
        await db.delete(partsRequisition).where(eq(partsRequisition.jobCardId, id));
        // Delete the job card
        await db.delete(jobCards).where(eq(jobCards.id, id));
        return NextResponse.json({ success: true, message: "Job card permanently deleted from database" });

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 500 });
  }
}

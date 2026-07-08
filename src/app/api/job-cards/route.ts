import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { jobCards, vehicles, mechanics, branches, users } from "@/db/schema";
import { eq, like, or, desc, and } from "drizzle-orm";
import { generateJobCardNumber } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";

  const conditions = [];
  if (user.branchId) conditions.push(eq(jobCards.branchId, user.branchId));
  if (status) conditions.push(eq(jobCards.status, status as any));
  if (search) conditions.push(or(like(jobCards.jobCardNumber, `%${search}%`), like(jobCards.description, `%${search}%`))!);

  const jobs = await db
    .select({
      id: jobCards.id, jobCardNumber: jobCards.jobCardNumber, description: jobCards.description,
      status: jobCards.status, priority: jobCards.priority, reportedDate: jobCards.reportedDate,
      startDate: jobCards.startDate, completedDate: jobCards.completedDate, remarks: jobCards.remarks,
      vehicle: vehicles, mechanic: mechanics, branch: branches, supervisor: users,
    })
    .from(jobCards)
    .leftJoin(vehicles, eq(jobCards.vehicleId, vehicles.id))
    .leftJoin(mechanics, eq(jobCards.mechanicId, mechanics.id))
    .leftJoin(branches, eq(jobCards.branchId, branches.id))
    .leftJoin(users, eq(jobCards.supervisorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobCards.createdAt))
    .limit(100);

  return NextResponse.json({ jobCards: jobs });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { vehicleId, mechanicId, description, priority, branchId } = body;
  if (!vehicleId || !description) return NextResponse.json({ error: "Vehicle and description required" }, { status: 400 });

  const [newJob] = await db
    .insert(jobCards)
    .values({
      jobCardNumber: generateJobCardNumber(), vehicleId, mechanicId: mechanicId || null,
      branchId: branchId || user.branchId || 1, supervisorId: user.id,
      description, priority: priority || "medium", status: "open",
    })
    .returning();

  return NextResponse.json({ success: true, jobCard: newJob });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const now = new Date();
  if (updates.status === "in_progress" && !updates.startDate) updates.startDate = now;
  if (updates.status === "completed") updates.completedDate = now;

  await db.update(jobCards).set({ ...updates, updatedAt: now }).where(eq(jobCards.id, id));
  return NextResponse.json({ success: true });
}

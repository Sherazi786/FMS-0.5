import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { mechanics, branches } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "mechanics") {
    const mechList = await db
      .select({ id: mechanics.id, name: mechanics.name, specialization: mechanics.specialization, status: mechanics.status, branch: branches })
      .from(mechanics)
      .leftJoin(branches, eq(mechanics.branchId, branches.id))
      .orderBy(desc(mechanics.name))
      .limit(200);
    return NextResponse.json({ mechanics: mechList });
  }

  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((user.role as string) === "accountant") {
    return NextResponse.json({ error: "Accountant has read-only access" }, { status: 403 });
  }

  const body = await req.json();
  const { name, specialization, branchId, status } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [m] = await db
    .insert(mechanics)
    .values({
      name,
      specialization: specialization || "General",
      branchId: branchId || user.branchId || 1,
      status: status || "active",
    })
    .returning();

  return NextResponse.json({ success: true, mechanic: m });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(mechanics).set(updates).where(eq(mechanics.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = parseInt(url.searchParams.get("id") || "0");
  const type = url.searchParams.get("type");
  if (type === "mechanics" && id) {
    // Soft delete
    await db.update(mechanics).set({ status: "inactive" }).where(eq(mechanics.id, id));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

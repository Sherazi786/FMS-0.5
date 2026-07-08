import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { vehicles, branches } from "@/db/schema";
import { eq, like, or, and, ne } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const branchId = url.searchParams.get("branchId");
  const all = url.searchParams.get("all") === "true";

  const conditions = [];
  if (all) {
    // Show all vehicles (for dropdowns)
    if (search) {
      conditions.push(or(
        like(vehicles.registrationNumber, `%${search}%`),
        like(vehicles.make, `%${search}%`),
        like(vehicles.model, `%${search}%`)
      )!);
    }
  } else {
    if (branchId) conditions.push(eq(vehicles.branchId, parseInt(branchId)));
    if (user.role !== "fleet_manager" && user.branchId) {
      conditions.push(eq(vehicles.branchId, user.branchId));
    }
    if (search) {
      conditions.push(or(
        like(vehicles.registrationNumber, `%${search}%`),
        like(vehicles.make, `%${search}%`),
        like(vehicles.model, `%${search}%`)
      )!);
    }
  }

  const vehicleList = await db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      vehicleType: vehicles.vehicleType,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      status: vehicles.status,
      branchId: vehicles.branchId,
      branch: branches,
    })
    .from(vehicles)
    .leftJoin(branches, eq(vehicles.branchId, branches.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(vehicles.registrationNumber)
    .limit(500);

  return NextResponse.json({ vehicles: vehicleList });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((user.role as string) === "accountant") {
    return NextResponse.json({ error: "Accountant has read-only access" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { registrationNumber, vehicleType, make, model, year, branchId, status } = body;

    if (!registrationNumber || !vehicleType) {
      return NextResponse.json(
        { error: "Registration number and vehicle type are required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.registrationNumber, registrationNumber.toUpperCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `Vehicle ${registrationNumber} already exists` },
        { status: 400 }
      );
    }

    const [v] = await db
      .insert(vehicles)
      .values({
        registrationNumber: registrationNumber.toUpperCase(),
        vehicleType,
        make: make || null,
        model: model || null,
        year: year && year !== "" ? parseInt(year) : null,
        branchId: branchId ? parseInt(branchId) : (user.branchId || 1),
        status: status || "active",
      })
      .returning();

    return NextResponse.json({ success: true, vehicle: v });
  } catch (error) {
    console.error("Add vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to add vehicle: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(vehicles).set(updates).where(eq(vehicles.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = parseInt(url.searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Soft delete - mark as inactive
  await db.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
  return NextResponse.json({ success: true });
}

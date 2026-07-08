import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { jobCards, users, mechanics, vehicles } from "@/db/schema";
import { eq, count, sql, and } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const branchId = user.branchId;

  if (user.role === "workshop_supervisor") {
    const openJobs = await db
      .select({ count: count() })
      .from(jobCards)
      .where(and(
        eq(jobCards.status, "open"),
        branchId ? eq(jobCards.branchId, branchId) : undefined
      ));

    const pendingJobs = await db
      .select({ count: count() })
      .from(jobCards)
      .where(and(
        eq(jobCards.status, "in_progress"),
        branchId ? eq(jobCards.branchId, branchId) : undefined
      ));

    const pendingParts = await db
      .select({ count: count() })
      .from(jobCards)
      .where(and(
        eq(jobCards.status, "pending_parts"),
        branchId ? eq(jobCards.branchId, branchId) : undefined
      ));

    const mechanicJobs = await db
      .select({
        mechanicName: mechanics.name,
        specialization: mechanics.specialization,
        totalJobs: count(),
        openJobs: sql<number>`SUM(CASE WHEN ${jobCards.status} = 'open' THEN 1 ELSE 0 END)`,
        inProgressJobs: sql<number>`SUM(CASE WHEN ${jobCards.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        completedJobs: sql<number>`SUM(CASE WHEN ${jobCards.status} = 'completed' THEN 1 ELSE 0 END)`,
      })
      .from(mechanics)
      .leftJoin(jobCards, eq(mechanics.id, jobCards.mechanicId))
      .groupBy(mechanics.id, mechanics.name, mechanics.specialization);

    return NextResponse.json({
      openJobs: Number(openJobs[0]?.count || 0),
      pendingJobs: Number(pendingJobs[0]?.count || 0),
      pendingParts: Number(pendingParts[0]?.count || 0),
      mechanicJobs,
    });
  }

  if (user.role === "store_executive") {
    return NextResponse.json({ pendingPartRequests: 0 });
  }

  if (user.role === "fleet_manager") {
    const totalOpen = await db
      .select({ count: count() })
      .from(jobCards)
      .where(sql`${jobCards.status} IN ('open', 'in_progress', 'pending_parts')`);
    const totalVehicles = await db.select({ count: count() }).from(vehicles);
    const totalMechanics = await db.select({ count: count() }).from(mechanics);
    const totalUsers = await db.select({ count: count() }).from(users);

    return NextResponse.json({
      totalOpenJobs: Number(totalOpen[0]?.count || 0),
      totalVehicles: Number(totalVehicles[0]?.count || 0),
      totalMechanics: Number(totalMechanics[0]?.count || 0),
      totalUsers: Number(totalUsers[0]?.count || 0),
    });
  }

  return NextResponse.json({});
}

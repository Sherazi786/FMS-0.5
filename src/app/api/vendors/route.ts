import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendorList = await db.select().from(vendors).orderBy(desc(vendors.rating));
  return NextResponse.json({ vendors: vendorList });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [vendor] = await db.insert(vendors).values(body).returning();
  return NextResponse.json({ success: true, vendor });
}

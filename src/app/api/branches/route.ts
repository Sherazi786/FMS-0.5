import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { db } from "@/db";
import { branches } from "@/db/schema";

export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.select().from(branches).orderBy(branches.id);
  return NextResponse.json({ branches: list });
}

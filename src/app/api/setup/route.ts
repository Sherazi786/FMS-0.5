import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Check if users table exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `);

    const exists = (result.rows?.[0] as any)?.exists;

    if (exists) {
      return NextResponse.json({
        success: true,
        message: "Database already initialized",
        needsInit: false,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Database needs initialization. Run: npx drizzle-kit push && npm run db:seed",
      needsInit: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { loginUser, seedDefaultAdmin } from "@/lib/auth-server";

async function ensureTablesExist() {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `);
    const exists = (result.rows?.[0] as any)?.exists;
    return !!exists;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if database is initialized
    const tablesExist = await ensureTablesExist();

    if (!tablesExist) {
      return NextResponse.json(
        {
          error: "Database not initialized. Please run setup script first.",
          setupRequired: true,
          instructions: "Run: node setup-neon.js in your local project with DATABASE_URL set",
        },
        { status: 503 }
      );
    }

    // Try to seed default admin (safe if already exists)
    await seedDefaultAdmin();

    const result = await loginUser(username.trim(), password);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid credentials or account is inactive" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });

    response.headers.set(
      "Set-Cookie",
      `session_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Login service error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return response;
}

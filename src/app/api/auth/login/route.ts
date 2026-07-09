import { NextRequest, NextResponse } from "next/server";
import { loginUser, seedDefaultAdmin } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    // Try seeding default data (safe to call multiple times)
    await seedDefaultAdmin();

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

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

    // Set cookie as fallback
    response.headers.set(
      "Set-Cookie",
      `session_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Login service error. Please try again or contact support.",
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

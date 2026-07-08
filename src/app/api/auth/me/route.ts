import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branchName,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

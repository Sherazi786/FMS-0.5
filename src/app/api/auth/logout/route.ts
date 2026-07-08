import { NextResponse } from "next/server";

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

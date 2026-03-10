import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, type Role } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const role = request.cookies.get("session_role")?.value as Role | undefined;
  const username = request.cookies.get("session_user")?.value;

  if (!role || !username) {
    return NextResponse.json({ authenticated: false });
  }

  const user = getUserByUsername(username);

  if (!user || user.role !== role) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
  });
}

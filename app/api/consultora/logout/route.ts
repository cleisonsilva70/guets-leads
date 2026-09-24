import { NextResponse } from "next/server";
import { CONSULTANT_SESSION_COOKIE } from "@/lib/auth/consultant-token";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CONSULTANT_SESSION_COOKIE);
  return response;
}

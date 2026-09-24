import { NextResponse } from "next/server";
import { hashAccessCode, normalizeAccessCode } from "@/lib/auth/access-code";
import {
  CONSULTANT_SESSION_COOKIE,
  CONSULTANT_SESSION_MAX_AGE_S,
  createConsultantSessionToken,
} from "@/lib/auth/consultant-token";
import { findConsultantByAccessCodeHash } from "@/lib/admin/consultants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? normalizeAccessCode(body.code) : "";
  if (code.length < 8) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  let consultant: { id: string; name: string } | null;
  try {
    consultant = await findConsultantByAccessCodeHash(await hashAccessCode(code));
  } catch (error) {
    console.error("Falha ao validar código de consultora", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (!consultant) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CONSULTANT_SESSION_COOKIE, await createConsultantSessionToken(consultant.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSULTANT_SESSION_MAX_AGE_S,
  });
  return response;
}

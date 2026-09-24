import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/auth/admin-session";
import {
  CONSULTANT_SESSION_COOKIE,
  readConsultantSessionToken,
} from "@/lib/auth/consultant-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isAdminRoute) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const valid = await isValidAdminSessionToken(token);

    if (!valid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // A checagem completa (consultora ainda ativa) é feita nas próprias páginas;
  // aqui só barra quem nem cookie válido tem.
  const isConsultantRoute = pathname.startsWith("/consultora") && pathname !== "/consultora/login";
  if (isConsultantRoute) {
    const consultantId = await readConsultantSessionToken(
      request.cookies.get(CONSULTANT_SESSION_COOKIE)?.value
    );
    if (!consultantId) {
      return NextResponse.redirect(new URL("/consultora/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/consultora/:path*"],
};

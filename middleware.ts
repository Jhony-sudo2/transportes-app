import { NextRequest, NextResponse } from "next/server";
const publicPages = ["/", "/login", "/register", "/forgot-password", "/auth/reset-password"];
const publicApis = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/users/register",
  "/api/auth/recovery/forgot",
  "/api/auth/recovery/reset",
];
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  if (publicPages.includes(path) || publicApis.includes(path)) {
    const response = NextResponse.next();
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (path.startsWith("/api/"))
    return NextResponse.json({ detail: "Módulo todavía no habilitado." }, { status: 404 });
  return NextResponse.redirect(new URL("/login", request.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|images/).*)"] };

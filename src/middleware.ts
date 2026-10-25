import { NextRequest, NextResponse } from "next/server";
const publicPages = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/first-login",
];
const publicApis = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/users/register",
  "/api/auth/recovery/forgot",
  "/api/auth/recovery/reset",
];
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  if (
    path === "/admin/sucursales" ||
    path === "/api/admin/branches" ||
    /^\/api\/admin\/branches\/[^/]+$/.test(path) ||
    path === "/api/admin/locations"
  ) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  }
  if (
    path === "/mi-cuenta" ||
    path === "/mi-cuenta/contrasena" ||
    path === "/api/account/profile" ||
    path === "/api/account/password" ||
    /^\/api\/account\/profile\/operations\/[^/]+$/.test(path) ||
    path === "/admin/usuarios" ||
    path === "/api/admin/users" ||
    path === "/api/admin/roles" ||
    path === "/api/branch-admin/context" ||
    path === "/api/branch-admin/buses" ||
    path === "/api/branch-admin/drivers" ||
    path === "/api/branch-admin/license-types" ||
    /^\/api\/branch-admin\/drivers\/[^/]+(?:\/salary)?$/.test(path) ||
    /^\/api\/branch-admin\/(buses|drivers)\/[^/]+\/availability$/.test(path) ||
    /^\/api\/branch-admin\/drivers\/[^/]+\/operations\/[^/]+$/.test(path) ||
    path === "/sucursal/buses" ||
    path === "/sucursal/choferes" ||
    path === "/sucursal/choferes/solicitudes" ||
    path === "/sucursal/buses/nuevo" ||
    path === "/sucursal/choferes/nuevo"
  ) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
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

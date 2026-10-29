import { NextRequest, NextResponse } from "next/server";

const legacyPages: Record<string, string> = {
  "/admin/usuarios": "/system-admin/users",
  "/admin/sucursales": "/system-admin/branches",
  "/sucursal/buses": "/branch-admin/buses",
  "/sucursal/buses/nuevo": "/branch-admin/buses/new",
  "/sucursal/choferes": "/branch-admin/drivers",
  "/sucursal/choferes/nuevo": "/branch-admin/drivers/new",
  "/sucursal/choferes/solicitudes": "/branch-admin/drivers/requests",
};
const publicPages = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/first-login",
];
const authenticatedPages = [
  "/",
  "/mi-cuenta",
  "/mi-cuenta/contrasena",
  "/system-admin",
  "/system-admin/users",
  "/system-admin/users/new",
  "/system-admin/branches",
  "/branch-admin",
  "/branch-admin/buses",
  "/branch-admin/buses/new",
  "/branch-admin/drivers",
  "/branch-admin/drivers/new",
  "/branch-admin/drivers/requests",
  "/branch-admin/cashiers/new",
  "/customer",
  "/customer/wallet",
  "/customer/purchases",
  "/customer/refunds",
  "/cashier",
  "/cashier/refunds",
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
  const legacyTarget = legacyPages[path];
  if (legacyTarget) {
    const target = request.nextUrl.clone();
    target.pathname = legacyTarget;
    const response = NextResponse.redirect(target, 308);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (
    path === "/system-admin/branches" ||
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
    authenticatedPages.includes(path) ||
    /^\/customer\/purchases\/[^/]+$/.test(path) ||
    /^\/customer\/refunds\/[^/]+$/.test(path) ||
    path === "/api/customer/refunds" ||
    /^\/api\/customer\/refunds\/[^/]+$/.test(path) ||
    path === "/api/cashier/context" ||
    /^\/api\/cashier\/refunds\/[^/]+$/.test(path) ||
    path === "/api/customer/wallet" ||
    path === "/api/customer/wallet/recharges" ||
    path === "/api/customer/purchases" ||
    /^\/api\/customer\/purchases\/[^/]+$/.test(path) ||
    /^\/api\/customer\/purchases\/[^/]+\/cancellation$/.test(path) ||
    path === "/api/account/profile" ||
    path === "/api/account/two-factor" ||
    path === "/api/account/password" ||
    /^\/api\/account\/profile\/operations\/[^/]+$/.test(path) ||
    path === "/api/admin/users" ||
    /^\/api\/admin\/users\/[^/]+\/branches$/.test(path) ||
    /^\/api\/admin\/users\/[^/]+\/availability$/.test(path) ||
    path === "/api/admin/roles" ||
    path === "/api/branch-admin/context" ||
    path === "/api/branch-admin/buses" ||
    /^\/api\/branch-admin\/buses\/[^/]+$/.test(path) ||
    path === "/api/branch-admin/drivers" ||
    path === "/api/branch-admin/cashiers" ||
    path === "/api/branch-admin/license-types" ||
    /^\/api\/branch-admin\/drivers\/[^/]+(?:\/(?:salary|license))?$/.test(path) ||
    /^\/api\/branch-admin\/(buses|drivers)\/[^/]+\/availability$/.test(path) ||
    /^\/api\/branch-admin\/drivers\/[^/]+\/operations\/[^/]+$/.test(path)
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

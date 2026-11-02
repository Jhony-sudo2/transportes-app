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
  "/trips",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/first-login",
  "/auth/verify-email",
  "/auth/confirm-email-change",
  "/auth/resend-verification",
];
const authenticatedPages = [
  "/",
  "/mi-cuenta",
  "/mi-cuenta/contrasena",
  "/system-admin",
  "/system-admin/users",
  "/system-admin/users/new",
  "/system-admin/branches",
  "/system-admin/bus-types",
  "/system-admin/roles",
  "/branch-admin",
  "/branch-admin/buses",
  "/branch-admin/buses/new",
  "/branch-admin/drivers",
  "/branch-admin/drivers/new",
  "/branch-admin/drivers/requests",
  "/branch-admin/cashiers/new",
  "/branch-admin/routes",
  "/branch-admin/trips",
  "/driver",
  "/driver/trips",
  "/driver/license",
  "/customer",
  "/customer/wallet",
  "/customer/purchases",
  "/customer/refunds",
  "/cashier",
  "/cashier/refunds",
];
const publicApis = [
  "/api/journey/branches",
  "/api/journey/routes",
  "/api/journey/trips",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/users/register",
  "/api/auth/recovery/forgot",
  "/api/auth/recovery/reset",
  "/api/auth/email/confirm",
  "/api/auth/email/resend",
  "/api/auth/email/confirm-change",
];
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  if (/^\/(?:api\/)?invoices\/contact-email\/(?:confirm|reject)$/.test(path)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (
    (request.method !== "GET" &&
      (path === "/api/customer/wallet/recharges" ||
        /^\/api\/customer\/purchases\/[^/]+\/cancellation$/.test(path))) ||
    /^\/api\/(?:customer|cashier)\/refunds(?:\/|$)/.test(path)
  ) {
    return NextResponse.json(
      {
        detail:
          "Este contrato anterior fue retirado. Utiliza las operaciones actuales de compras y reembolsos.",
      },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    /^\/api\/(?:commerce|rentals|maintenance|analytics)\//.test(path) ||
    /^\/receipts\/[^/]+$/.test(path) ||
    /^\/customer\/trips\/[^/]+$/.test(path) ||
    /^\/(?:branch-admin|cashier)\/pos(?:\/[^/]+)?$/.test(path) ||
    /^\/(?:customer|branch-admin|system-admin|cashier)\/rentals(?:\/[^/]+)?$/.test(path) ||
    [
      "/cashier/cash",
      "/branch-admin/cash",
      "/system-admin/cancellation-policy",
      "/branch-admin/maintenance",
      "/system-admin/expense-categories",
      "/system-admin/reports",
      "/branch-admin/reports",
      "/branch-admin/seat-restrictions",
      "/cashier/seat-restrictions",
    ].includes(path)
  ) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
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
    /^\/api\/admin\/branches\/[^/]+\/availability$/.test(path) ||
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
    path === "/api/account/email-change" ||
    path === "/api/account/two-factor" ||
    path === "/api/account/password" ||
    /^\/api\/account\/profile\/operations\/[^/]+$/.test(path) ||
    path === "/api/admin/users" ||
    /^\/api\/admin\/users\/[^/]+\/branches$/.test(path) ||
    /^\/api\/admin\/users\/[^/]+\/availability$/.test(path) ||
    path === "/api/admin/roles" ||
    path === "/api/admin/bus-types" ||
    /^\/api\/admin\/bus-types\/[^/]+$/.test(path) ||
    path === "/api/branch-admin/bus-types" ||
    path === "/api/branch-admin/bus-states" ||
    path === "/api/branch-admin/context" ||
    path === "/api/branch-admin/journey-context" ||
    path === "/api/branch-admin/route-branches" ||
    path === "/api/branch-admin/routes" ||
    /^\/api\/branch-admin\/routes\/[^/]+$/.test(path) ||
    path === "/api/branch-admin/trips" ||
    /^\/api\/branch-admin\/trips\/[^/]+\/(?:departure|arrival|cancel|driver)$/.test(path) ||
    path === "/api/driver/trips" ||
    /^\/api\/driver\/trips\/[^/]+\/(?:departure|arrival)$/.test(path) ||
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

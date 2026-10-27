// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("Rutas de las vistas por rol", () => {
  it.each([
    ["/admin/usuarios", "/system-admin/users"],
    ["/admin/sucursales", "/system-admin/branches"],
    ["/sucursal/buses", "/branch-admin/buses"],
    ["/sucursal/buses/nuevo", "/branch-admin/buses/new"],
    ["/sucursal/choferes", "/branch-admin/drivers"],
    ["/sucursal/choferes/nuevo", "/branch-admin/drivers/new"],
    ["/sucursal/choferes/solicitudes", "/branch-admin/drivers/requests"],
  ])("redirige %s y conserva la referencia de una solicitud", (source, target) => {
    const query = "?driverId=31&branchId=2&operationId=550e8400-e29b-41d4-a716-446655440000";
    const response = middleware(new NextRequest("http://localhost:3000" + source + query));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("http://localhost:3000" + target + query);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([
    "/",
    "/system-admin",
    "/system-admin/users",
    "/customer",
    "/customer/wallet",
    "/customer/purchases",
    "/customer/purchases/10",
    "/api/customer/wallet",
    "/api/customer/wallet/recharges",
    "/api/customer/purchases/10",
    "/system-admin/branches",
    "/branch-admin",
    "/branch-admin/buses",
    "/branch-admin/buses/new",
    "/branch-admin/drivers",
    "/branch-admin/drivers/new",
    "/branch-admin/drivers/requests",
    "/mi-cuenta",
    "/mi-cuenta/contrasena",
    "/api/admin/branches",
    "/api/branch-admin/drivers/31/license",
    "/api/account/profile",
  ])("delega %s a su layout o API con control de acceso", (path) => {
    const response = middleware(new NextRequest("http://localhost:3000" + path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
  });
  it("mantiene deshabilitadas las APIs del proyecto anterior", () => {
    expect(middleware(new NextRequest("http://localhost:3000/api/congresses")).status).toBe(404);
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/branch-admin/cashiers/route";
const mocks = vi.hoisted(() => ({ session: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
function request(origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/branch-admin/cashiers", {
    method: "POST",
    headers: { Origin: origin },
    body: JSON.stringify({ roleId: 5 }),
  });
}
describe("Alta de cajeros exclusivamente desde administración global", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each(["SUCURSAL_ADMIN", "CAJERO", "CUSTOMER", "DRIVER", "ADMIN"])(
    "no permite usar la ruta de alta de sucursal desde %s",
    async (name) => {
      mocks.session.mockResolvedValue({
        id: 7,
        isActive: true,
        resetPassword: false,
        role: { id: 1, name },
      });
      const result = await POST(request());
      expect(result.status).toBe(403);
      expect((await result.json()).detail).toContain("administrador del sistema");
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("rechaza cuentas anónimas", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza origen ajeno antes de consultar sesión", async () => {
    expect((await POST(request("https://otro.example"))).status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});

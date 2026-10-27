// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/branch-admin/cashiers/route";
import { MANAGED_BRANCH_COOKIE } from "@/lib/auth/cookies";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const manager = {
  id: 3,
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  resetPassword: false,
  branchIds: [1, 2],
};
const input = {
  person: {
    name: "Juan",
    lastName: "Pérez",
    dpi: "1234567890123",
    nit: "1234567",
    phone: "55555555",
    adress: "Guatemala",
  },
  email: "juan@example.com",
  branchId: 2,
};
const created = {
  id: 8,
  name: "Juan",
  lastName: "Pérez",
  email: input.email,
  role: { id: 5, name: "CAJERO" },
};
function request(body: unknown = input, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/branch-admin/cashiers", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Alta de cajeros por el administrador de sucursales", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(manager);
    mocks.get.mockImplementation((name) => ({
      value: name === MANAGED_BRANCH_COOKIE ? "2" : "private-token",
    }));
    mocks.fetch.mockResolvedValue(Response.json(created, { status: 201 }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("envía el contrato real a users/cashiers con el rol fijo y la sucursal validada", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "created", user: created, branchId: 2 });
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/api\/v1\/users\/cashiers$/);
    expect(JSON.parse(options.body)).toEqual({
      userCreate: { person: input.person, email: input.email, roleId: 5 },
      branchId: 2,
    });
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.cache).toBe("no-store");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])("impide el alta al rol %s", async (name) => {
    mocks.session.mockResolvedValue({ ...manager, role: { id: 1, name } });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("exige sesión activa y contraseña inicial resuelta", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    mocks.session.mockResolvedValue({ ...manager, isActive: false });
    expect((await POST(request())).status).toBe(401);
    mocks.session.mockResolvedValue({ ...manager, resetPassword: true });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza un origen externo", async () => {
    expect((await POST(request(input, "https://other.example"))).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([{ roleId: 1 }, { password: "secret" }, { userId: 1 }, { userCreate: { roleId: 1 } }])(
    "rechaza campos adicionales: %j",
    async (extra) => {
      expect((await POST(request({ ...input, ...extra }))).status).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("no crea en una sucursal distinta a la seleccionada aunque esté asignada", async () => {
    expect((await POST(request({ ...input, branchId: 1 }))).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("bloquea sucursales ajenas y cookies de asignaciones revocadas", async () => {
    mocks.get.mockImplementation((name) => ({
      value: name === MANAGED_BRANCH_COOKIE ? "99" : "private-token",
    }));
    expect((await POST(request({ ...input, branchId: 99 }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("selecciona automáticamente la única sucursal asignada", async () => {
    mocks.session.mockResolvedValue({ ...manager, branchIds: [2] });
    mocks.get.mockImplementation((name) =>
      name === MANAGED_BRANCH_COOKIE ? undefined : { value: "private-token" },
    );
    expect((await POST(request())).status).toBe(201);
  });
  it("sin sucursal seleccionada no envía el alta", async () => {
    mocks.get.mockImplementation((name) =>
      name === MANAGED_BRANCH_COOKIE ? undefined : { value: "private-token" },
    );
    expect((await POST(request())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([{ branchId: 0 }, { email: "bad" }, { person: { ...input.person, name: " " } }])(
    "valida los datos: %j",
    async (change) => {
      expect((await POST(request({ ...input, ...change }))).status).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("conserva el conflicto de correo, DPI o NIT", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({}, { status: 409 }));
    expect((await POST(request())).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([{ role: { id: 1, name: "ADMIN" } }, { email: "other@example.com" }, { id: null }])(
    "no confirma un alta distinta o incompleta: %j",
    async (change) => {
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...created, ...change }));
      expect((await POST(request())).status).toBe(502);
    },
  );
  it("no reintenta automáticamente si se pierde la respuesta", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    expect((await POST(request())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["/branch-admin/cashiers/new", "/api/branch-admin/cashiers"])(
    "habilita %s sin caché",
    (path) => {
      const response = middleware(new NextRequest("http://localhost:3000" + path));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );
});

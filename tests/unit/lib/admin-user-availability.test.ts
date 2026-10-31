// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/admin/users/[id]/availability/route";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, delete: mocks.remove }),
}));
const admin = { id: 1, isActive: true, resetPassword: false, role: { id: 1, name: "ADMIN" } };
const target = {
  id: 9,
  name: "Ana",
  lastName: "Cliente",
  email: "ana@example.com",
  role: { id: 2, name: "CUSTOMER" },
  isActive: true,
  branchIds: [],
};
const context = (id = "9") => ({ params: Promise.resolve({ id }) });
function request(body: unknown = { isActive: false }, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/users/9/availability", {
    method: "PATCH",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Activar y desactivar cuentas desde ADMIN", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(admin);
    mocks.get.mockReturnValue({ value: "admin-token" });
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([true, false])(
    "solicita isActive=%s al endpoint vigente con PUT sin cuerpo",
    async (isActive) => {
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...target, isActive }));
      const response = await PATCH(request({ isActive }), context());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: { ...target, isActive }, signedOut: false });
      const [url, options] = mocks.fetch.mock.calls[0]!;
      expect(url).toMatch(new RegExp(`/users/9/${isActive ? "activate" : "deactivate"}$`));
      expect(options.method).toBe("PUT");
      expect(options.body).toBeUndefined();
      expect(options.headers.Authorization).toBe("Bearer admin-token");
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
      expect(mocks.remove).not.toHaveBeenCalled();
    },
  );
  it.each(["SUCURSAL_ADMIN", "CUSTOMER", "CAJERO", "DRIVER"])(
    "no permite administrar cuentas desde %s",
    async (name) => {
      mocks.session.mockResolvedValue({ ...admin, role: { id: 3, name } });
      expect((await PATCH(request(), context())).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([null, { ...admin, isActive: false }])("requiere una cuenta activa %j", async (actor) => {
    mocks.session.mockResolvedValue(actor);
    expect((await PATCH(request(), context())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("requiere token y contraseña inicial resuelta", async () => {
    mocks.get.mockReturnValue(undefined);
    expect((await PATCH(request(), context())).status).toBe(401);
    mocks.get.mockReturnValue({ value: "token" });
    mocks.session.mockResolvedValue({ ...admin, resetPassword: true });
    expect((await PATCH(request(), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza origen externo", async () => {
    expect((await PATCH(request(undefined, "https://otro.example"), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { isActive: "false" },
    { isActive: null },
    { isActive: false, id: 99 },
    { isActive: false, roleId: 1 },
    { isActive: false, branchId: 2 },
  ])("no admite otros identificadores ni estado inválido %j", async (body) => {
    expect((await PATCH(request(body), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "abc", "9007199254740992"])("valida el ID %s", async (id) => {
    expect((await PATCH(request(), context(id))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([{ id: 99, isActive: false }, { isActive: true }, { isActive: false, email: null }])(
    "no confirma una respuesta distinta %j",
    async (change) => {
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...target, ...change }));
      expect((await PATCH(request(), context())).status).toBe(502);
      expect(mocks.remove).not.toHaveBeenCalled();
    },
  );
  it.each(["detail", "message"])(
    "muestra el rechazo del último administrador desde %s sin cerrar su sesión",
    async (key) => {
      mocks.fetch.mockResolvedValueOnce(
        Response.json(
          { [key]: "No se puede desactivar al último administrador activo" },
          { status: 400 },
        ),
      );
      const response = await PATCH(request(), context("1"));
      expect(response.status).toBe(400);
      expect((await response.json()).detail).toContain("último administrador");
      expect(mocks.remove).not.toHaveBeenCalled();
    },
  );
  it("cierra la sesión si la API confirma la desactivación de la propia cuenta", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...target, ...admin, isActive: false }));
    const response = await PATCH(request(), context("1"));
    expect(response.status).toBe(200);
    expect((await response.json()).signedOut).toBe(true);
    expect(mocks.remove.mock.calls.map(([name]) => name)).toEqual([
      "access_token",
      "refresh_token",
      "managed_branch_id",
    ]);
  });
  it("no cierra sesión si la respuesta no confirma que su cuenta quedó inactiva", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...target, ...admin }));
    expect((await PATCH(request(), context("1"))).status).toBe(502);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("no repite la petición tras un timeout", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    expect((await PATCH(request(), context())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("permite la ruta del BFF sin caché", () => {
    const response = middleware(request());
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/branch-admin/drivers/[id]/license/route";
import { DriverLicenseRequestSchema } from "@/lib/validators/fleet-resources";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const user = {
  id: 3,
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  resetPassword: false,
  branchIds: [1, 2],
};
const driver = {
  id: 31,
  name: "Ana",
  lastName: "Lopez",
  userId: 321,
  status: "ACTIVE",
  pendingOperationId: null,
  licenseId: 81,
  licenseTypeId: 4,
  number: "LIC-1",
  expirationDate: "2030-12-31",
  licenseTypeName: "A",
};
const license = { id: 81, number: "LIC-1", expirationDate: "2030-12-31", tipo: "A" };
const types = [
  { id: 4, name: "A" },
  { id: 8, name: "B" },
];
const input = { branchId: 2, number: "LIC-RENOVADA", expirationDate: "2031-12-31", licenseType: 8 };
const updated = { id: 81, number: input.number, expirationDate: input.expirationDate, tipo: "B" };
const context = (id = "31") => ({ params: Promise.resolve({ id }) });
const getRequest = (branchId = 2) =>
  new NextRequest(`http://localhost:3000/api/branch-admin/drivers/31/license?branchId=${branchId}`);
const putRequest = (data: unknown = input, origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/branch-admin/drivers/31/license", {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
const writes = () => mocks.fetch.mock.calls.filter(([, options]) => options.method === "PUT");
describe("Licencias administradas por sucursal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((name: string) => ({
      value: name === "access_token" ? "private-token" : "2",
    }));
    mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
      if (url.endsWith("/branches/2/drivers")) return Response.json([driver]);
      if (url.endsWith("/licenses/types")) return Response.json(types);
      if (url.endsWith("/licenses/81"))
        return Response.json(options.method === "PUT" ? updated : license);
      throw new Error("Ruta inesperada en la prueba");
    });
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("precarga la licencia del chofer y el tipo por su identificador", async () => {
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      branchId: 2,
      types,
      license: { number: license.number, expirationDate: license.expirationDate, licenseType: 4 },
    });
    expect(mocks.fetch.mock.calls.some(([url]) => url.endsWith("/licenses/81"))).toBe(true);
    expect(writes()).toHaveLength(0);
  });
  it("edita la licencia derivada del chofer y confirma todos los datos devueltos", async () => {
    const response = await PUT(putRequest(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      branchId: 2,
      item: {
        ...driver,
        number: input.number,
        expirationDate: input.expirationDate,
        licenseTypeName: "B",
        licenseTypeId: 8,
      },
    });
    const [url, options] = writes()[0] ?? [];
    expect(url).toMatch(/\/licenses\/81$/);
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(JSON.parse(options.body)).toEqual({
      number: input.number,
      expirationDate: input.expirationDate,
      licenseType: 8,
    });
    expect(writes()).toHaveLength(1);
  });
  it("impide modificar desde otro origen o consultar otra sucursal", async () => {
    expect((await PUT(putRequest(input, "https://otro.example"), context())).status).toBe(403);
    expect((await GET(getRequest(1), context())).status).toBe(409);
    expect((await PUT(putRequest({ ...input, branchId: 1 }), context())).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { ...user, role: { id: 4, name: "DRIVER" } },
    { ...user, role: { id: 1, name: "ADMIN" } },
  ])("requiere administrador de sucursal: %j", async (actor) => {
    mocks.session.mockResolvedValue(actor);
    const status = actor ? 403 : 401;
    expect((await GET(getRequest(), context())).status).toBe(status);
    expect((await PUT(putRequest(), context())).status).toBe(status);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("verifica la pertenencia del chofer antes de leer o editar una licencia", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, id: 99 }]));
    expect((await PUT(putRequest(), context())).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...driver, status: "PENDING" },
    { ...driver, status: "ACCOUNT_REJECTED" },
    { ...driver, pendingOperationId: "pending" },
    { ...driver, userId: null },
  ])("impide editar una cuenta sin confirmar o pendiente: %j", async (record) => {
    mocks.fetch.mockResolvedValueOnce(Response.json([record]));
    expect((await PUT(putRequest(), context())).status).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it("acepta un chofer inactivo con cuenta confirmada", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, status: "INACTIVE" }]));
    expect((await PUT(putRequest(), context())).status).toBe(200);
  });
  it("no confunde el ID del chofer con una licencia sin referencia", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, licenseId: null }]));
    expect((await GET(getRequest(), context())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { number: "" },
    { expirationDate: "2031-02-29" },
    { licenseType: 0 },
    { licenseType: "8" },
    { licenseId: 99 },
  ])("valida los campos sin aceptar referencias del cliente: %j", async (change) => {
    expect(DriverLicenseRequestSchema.safeParse({ ...input, ...change }).success).toBe(false);
    expect((await PUT(putRequest({ ...input, ...change }), context())).status).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it("rechaza un vencimiento anterior y un tipo fuera del catálogo", async () => {
    expect(
      (await PUT(putRequest({ ...input, expirationDate: "2029-12-31" }), context())).status,
    ).toBe(400);
    expect((await PUT(putRequest({ ...input, licenseType: 999 }), context())).status).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it.each([{ id: 99 }, { number: "OTRA" }, { expirationDate: "2035-01-01" }, { tipo: "A" }])(
    "no confirma respuestas que no corresponden al cambio: %j",
    async (mismatch) => {
      const original = mocks.fetch.getMockImplementation();
      if (!original) throw new Error("Falta el servicio simulado.");
      mocks.fetch.mockImplementation((url: string, options: RequestInit) =>
        options.method === "PUT"
          ? Promise.resolve(Response.json({ ...updated, ...mismatch }))
          : original(url, options),
      );
      expect((await PUT(putRequest(), context())).status).toBe(502);
      expect(writes()).toHaveLength(1);
    },
  );
  it("conserva un rechazo por licencia duplicada y no repite la escritura", async () => {
    const original = mocks.fetch.getMockImplementation();
    if (!original) throw new Error("Falta el servicio simulado.");
    mocks.fetch.mockImplementation((url: string, options: RequestInit) =>
      options.method === "PUT"
        ? Promise.resolve(
            Response.json({ detail: "Número de licencia ya registrado." }, { status: 409 }),
          )
        : original(url, options),
    );
    const response = await PUT(putRequest(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("ya registrado");
    expect(writes()).toHaveLength(1);
  });
});

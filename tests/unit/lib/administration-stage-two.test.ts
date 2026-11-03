// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as catalog, POST as create } from "@/app/api/admin/bus-types/route";
import { PATCH as edit } from "@/app/api/admin/bus-types/[id]/route";
import { GET as branchCatalog } from "@/app/api/branch-admin/bus-types/route";
import { PATCH as branchStatus } from "@/app/api/admin/branches/[id]/availability/route";
import { getBusTypeForUnit } from "@/lib/api/bus-types";
import { CreateStaffUserSchema, StaffUserResultSchema } from "@/lib/validators/admin-user";
import { middleware } from "@/middleware";
import { GET as busStates } from "@/app/api/branch-admin/bus-states/route";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const user = {
  id: 7,
  isActive: true,
  resetPassword: false,
  role: { id: 1, name: "ADMIN" },
  branchIds: [2],
};
const fields = {
  name: "Ejecutivo",
  description: "Asientos amplios",
  capacity: 40,
  fuelEstimatePerKm: 2.1234,
  depreciationPerKm: 0.1234,
  suggestedDriverSalaryPerTrip: 150.5,
  active: true,
};
const type = { id: 1, ...fields };
const wireType = { busTypeId: 1, ...fields };
const context = (id = "1") => ({ params: Promise.resolve({ id }) });
function request(body: unknown = fields, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/bus-types", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Fase 2: tipos de bus, ámbito y contratos administrativos", () => {
  it("permite consultar estados de bus con ámbito de sucursal", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 3, name: "SUCURSAL_ADMIN" } });
    mocks.fetch.mockResolvedValueOnce(Response.json([{ id: 1, name: "AVAILABLE" }]));
    expect(await (await busStates()).json()).toEqual([{ id: 1, name: "AVAILABLE" }]);
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((key: string) => ({
      value: key === "access_token" ? "private-token" : "2",
    }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("consulta catálogo completo de administrador", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([wireType]));
    expect(await (await catalog()).json()).toEqual([type]);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/bus-types$/);
  });
  it("registra capacidad y tarifas por tipo sin cálculos de costo en la SPA", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(wireType, { status: 201 }));
    expect((await create(request())).status).toBe(201);
    const options = mocks.fetch.mock.calls[0]?.[1];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(fields);
    expect(options.headers.Authorization).toBe("Bearer private-token");
  });
  it("actualiza el tipo mediante PATCH y verifica los campos devueltos", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...wireType, active: false }));
    expect((await edit(request({ ...fields, active: false }), context())).status).toBe(200);
    expect(mocks.fetch.mock.calls[0]?.[1].method).toBe("PATCH");
  });
  it.each(["SUCURSAL_ADMIN", "CUSTOMER", "CAJERO", "DRIVER"])(
    "reserva la escritura a ADMIN: %s",
    async (name) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 3, name } });
      expect((await create(request())).status).toBe(403);
      expect((await edit(request(), context())).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("permite consulta del catálogo al administrador de sucursal sin darle escritura", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 3, name: "SUCURSAL_ADMIN" } });
    mocks.fetch.mockResolvedValueOnce(Response.json([wireType]));
    expect(await (await branchCatalog()).json()).toEqual([type]);
  });
  it.each(["ADMIN", "CUSTOMER", "CAJERO", "DRIVER"])(
    "protege la consulta de sucursal de otros roles: %s",
    async (name) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 1, name } });
      expect((await branchCatalog()).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { capacity: 0 },
    { capacity: 2.5 },
    { fuelEstimatePerKm: -1 },
    { fuelEstimatePerKm: 1.12345 },
    { depreciationPerKm: -0.01 },
    { suggestedDriverSalaryPerTrip: 0.001 },
    { active: "true" },
    { id: 7 },
    { branchId: 2 },
  ])("rechaza datos inválidos o campos inyectados %j", async (data) => {
    expect((await create(request({ ...fields, ...data }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("admite tarifas y salario sugerido de cero", async () => {
    const zero = {
      ...fields,
      fuelEstimatePerKm: 0,
      depreciationPerKm: 0,
      suggestedDriverSalaryPerTrip: 0,
    };
    mocks.fetch.mockResolvedValueOnce(Response.json({ busTypeId: 1, ...zero }));
    expect((await create(request(zero))).status).toBe(201);
  });
  it("conserva el rechazo de capacidad en uso sin reenviar", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json(
        { detail: "El tipo tiene buses asociados", code: "TYPE_CAPACITY_IN_USE" },
        { status: 409 },
      ),
    );
    const response = await edit(request(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("buses asociados");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("conserva código de negocio y correlación al rechazar habilitación", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json(
        { detail: "Falta responsable", code: "BRANCH_ADMIN_REQUIRED", correlationId: "branch-1" },
        { status: 409 },
      ),
    );
    const result = await branchStatus(request({ active: true }), context());
    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({
      code: "BRANCH_ADMIN_REQUIRED",
      correlationId: "branch-1",
      detail: "Falta responsable",
    });
  });
  it.each([{}, { ...type, capacity: 49 }])(
    "no confirma respuesta distinta del tipo %j",
    async (raw) => {
      mocks.fetch.mockResolvedValueOnce(Response.json(raw));
      expect((await create(request())).status).toBe(502);
    },
  );
  it("no reintenta una escritura cuya respuesta se perdió", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    expect((await create(request())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("resuelve la capacidad contractual del tipo en lugar de multiplicar filas y columnas", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([wireType]));
    expect((await getBusTypeForUnit("token", 1, 9, 4)).capacity).toBe(40);
  });
  it.each([
    { id: 999, rows: 12, active: true },
    { id: 1, rows: 11, active: true },
    { id: 1, rows: 12, active: false },
  ])("rechaza tipo o distribución incompatible %j", async ({ id, rows, active }) => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...wireType, active }]));
    await expect(getBusTypeForUnit("token", id, rows, 4)).rejects.toMatchObject({ status: 422 });
  });
  it("conserva un tipo inactivo ya asignado al editar", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...wireType, active: false }]));
    expect((await getBusTypeForUnit("token", 1, 10, 4, 1)).active).toBe(false);
  });
  it("solicita habilitación de sucursal sin inventar responsables", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ id: 1, name: "Central", active: true }));
    const response = await branchStatus(request({ active: true }), context());
    expect(response.status).toBe(200);
    expect(mocks.fetch.mock.calls[0]?.[1].method).toBe("PATCH");
    expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({ active: true });
  });
  it("muestra el rechazo por falta de administrador activo de la sucursal", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ detail: "La sucursal requiere un administrador activo" }, { status: 409 }),
    );
    const response = await branchStatus(request({ active: true }), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("administrador activo");
  });
  it("no confirma un estado de sucursal que el proveedor no devolvió", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ id: 1, name: "Central" }));
    expect((await branchStatus(request({ active: true }), context())).status).toBe(502);
  });
  it("normaliza el resultado canónico de personal sin confundir id de usuario y sucursal", () => {
    const result = StaffUserResultSchema.parse({
      userId: 50,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: "CASHIER",
      active: true,
      branchIds: [2],
    });
    expect(result).toMatchObject({
      id: 50,
      isActive: true,
      role: { id: 5, name: "CAJERO" },
      branchIds: [2],
    });
  });
  it("exige sucursales al registrar responsables y una única para cajero", () => {
    const input = {
      person: {
        name: "Ana",
        lastName: "Pérez",
        nit: "123",
        dpi: "123",
        phone: "55555555",
        adress: "Centro",
      },
      email: "ana@example.com",
      roleId: 3,
      branchIds: [],
    };
    expect(CreateStaffUserSchema.safeParse(input).success).toBe(false);
    expect(CreateStaffUserSchema.safeParse({ ...input, branchIds: [2, 3] }).success).toBe(true);
    expect(
      CreateStaffUserSchema.safeParse({ ...input, roleId: 5, branchIds: [2, 3] }).success,
    ).toBe(false);
    expect(CreateStaffUserSchema.safeParse({ ...input, roleId: 2 }).success).toBe(false);
    expect(CreateStaffUserSchema.safeParse({ ...input, roleId: 4 }).success).toBe(false);
  });
  it.each([
    "/system-admin/bus-types",
    "/api/admin/bus-types",
    "/api/admin/bus-types/1",
    "/api/branch-admin/bus-types",
    "/api/admin/branches/1/availability",
  ])("habilita sin caché %s", (path) => {
    const response = middleware(new NextRequest("http://localhost:3000" + path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rechaza origen ajeno antes de leer catálogo o escribir", async () => {
    expect((await create(request(fields, "https://otro.example"))).status).toBe(403);
    expect(
      (await branchStatus(request({ active: true }, "https://otro.example"), context())).status,
    ).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

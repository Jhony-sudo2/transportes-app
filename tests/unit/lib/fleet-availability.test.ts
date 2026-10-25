// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as updateBus } from "@/app/api/branch-admin/buses/[id]/availability/route";
import { PATCH as updateDriver } from "@/app/api/branch-admin/drivers/[id]/availability/route";

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
const bus = { id: 4, plateNumber: "C123ABC", brand: "Marca", model: "2025", state: "AVAILABLE" };
const driver = {
  id: 31,
  userId: 321,
  name: "Ana",
  lastName: "Lopez",
  status: "ACTIVE",
  pendingOperationId: null,
};
const context = (id = "4") => ({ params: Promise.resolve({ id }) });
function request(
  resource = "buses",
  data: unknown = { branchId: 2, active: false },
  origin = "http://localhost:3000",
) {
  return new NextRequest(`http://localhost:3000/api/branch-admin/${resource}/4/availability`, {
    method: "PATCH",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

describe("Disponibilidad de flota por sucursal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((name: string) => ({
      value: name === "access_token" ? "private-token" : "2",
    }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([false, true])(
    "envia active=%s del bus por JSON, acepta 204 y consulta el estado confirmado",
    async (active) => {
      const initial = { ...bus, state: active ? "OUT_OF_SERVICE" : "AVAILABLE" };
      const changed = { ...bus, state: active ? "AVAILABLE" : "OUT_OF_SERVICE" };
      mocks.fetch
        .mockResolvedValueOnce(Response.json([initial]))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(Response.json(changed));
      const response = await updateBus(request("buses", { branchId: 2, active }), context());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ item: changed, branchId: 2 });
      expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/branches\/2\/buses$/);
      const [url, options] = mocks.fetch.mock.calls[1] ?? [];
      expect(url).toMatch(/\/api\/v1\/buses\/4\/disponibilidad$/);
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body)).toEqual({ active });
      expect(options.headers.Authorization).toBe("Bearer private-token");
      expect(mocks.fetch.mock.calls[2]?.[0]).toMatch(/\/api\/v1\/buses\/4$/);
    },
  );

  it.each([false, true])(
    "envia active=%s del chofer como parametro y valida la respuesta",
    async (active) => {
      const initial = { ...driver, status: active ? "INACTIVE" : "ACTIVE" };
      const changed = { ...driver, status: active ? "ACTIVE" : "INACTIVE" };
      mocks.fetch
        .mockResolvedValueOnce(Response.json([initial]))
        .mockResolvedValueOnce(Response.json(changed));
      const response = await updateDriver(
        request("drivers", { branchId: 2, active }),
        context("31"),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ item: changed, branchId: 2 });
      const [url, options] = mocks.fetch.mock.calls[1] ?? [];
      expect(url).toMatch(new RegExp("/api/v1/drivers/31/disponibilidad\\?active=" + active + "$"));
      expect(options.method).toBe("PATCH");
      expect(options.body).toBeUndefined();
    },
  );

  it("rechaza otro rol y una cuenta sin sesion antes de acceder a Fleet", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 2, name: "CUSTOMER" } });
    expect((await updateBus(request(), context())).status).toBe(403);
    expect((await updateDriver(request("drivers"), context("31"))).status).toBe(403);
    mocks.session.mockResolvedValue(null);
    expect((await updateBus(request(), context())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rechaza un origen externo, identificadores y estados invalidos", async () => {
    expect(
      (
        await updateBus(
          request("buses", { branchId: 2, active: false }, "https://otro.example"),
          context(),
        )
      ).status,
    ).toBe(403);
    expect((await updateBus(request(), context("0"))).status).toBe(400);
    for (const data of [
      { branchId: 2, active: "false" },
      { branchId: 2 },
      { branchId: 2, active: false, userId: 321 },
    ])
      expect((await updateBus(request("buses", data), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rechaza una seleccion cambiada o sin sucursal elegida", async () => {
    expect(
      (await updateBus(request("buses", { branchId: 1, active: false }), context())).status,
    ).toBe(409);
    mocks.get.mockImplementation((name: string) =>
      name === "access_token" ? { value: "private-token" } : undefined,
    );
    expect((await updateDriver(request("drivers"), context("31"))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("verifica pertenencia antes de enviar cualquier PATCH", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...bus, id: 9 }]));
    expect((await updateBus(request(), context())).status).toBe(403);
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, id: 32 }]));
    expect((await updateDriver(request("drivers"), context("31"))).status).toBe(403);
    expect(mocks.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });

  it("conserva el estado de los buses en servicio", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...bus, state: "IN_SERVICE" }]));
    const response = await updateBus(request(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("Finaliza el viaje");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: "PENDING", pendingOperationId: "550e8400-e29b-41d4-a716-446655440000" },
    { status: "ACCOUNT_REJECTED" },
    { userId: null },
    { pendingOperationId: "" },
    { pendingOperationId: "550e8400-e29b-41d4-a716-446655440000" },
  ])(
    "no altera registros de choferes sin confirmar o con operaciones pendientes: %j",
    async (changed) => {
      mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, ...changed }]));
      expect((await updateDriver(request("drivers"), context("31"))).status).toBe(409);
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("una solicitud repetida conserva el estado sin reenviar el PATCH", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...bus, state: "OUT_OF_SERVICE" }]));
    expect((await updateBus(request(), context())).status).toBe(200);
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...driver, status: "INACTIVE" }]));
    expect((await updateDriver(request("drivers"), context("31"))).status).toBe(200);
    expect(mocks.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });

  it("conserva los errores del servicio sin reintentar la modificacion", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([driver]))
      .mockResolvedValueOnce(
        Response.json({ detail: "El registro del chofer no esta confirmado" }, { status: 400 }),
      );
    const response = await updateDriver(request("drivers"), context("31"));
    expect(response.status).toBe(400);
    expect((await response.json()).detail).toContain("no esta confirmado");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ...driver, id: 99, status: "INACTIVE" },
    { ...driver, status: "ACTIVE" },
  ])("no anuncia exito para una respuesta de chofer incorrecta", async (changed) => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([driver]))
      .mockResolvedValueOnce(Response.json(changed));
    expect((await updateDriver(request("drivers"), context("31"))).status).toBe(502);
  });

  it("indica que se consulte el listado cuando el cambio del bus no puede confirmarse", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([bus]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(bus));
    const response = await updateBus(request(), context());
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toContain("Actualiza el listado");
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
});

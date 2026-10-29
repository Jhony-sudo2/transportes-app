// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createBus, GET as listBuses } from "@/app/api/branch-admin/buses/route";
import { POST as createDriver, GET as listDrivers } from "@/app/api/branch-admin/drivers/route";
import { GET as licenseTypes } from "@/app/api/branch-admin/license-types/route";
import { GET as operation } from "@/app/api/branch-admin/drivers/[id]/operations/[operationId]/route";
import {
  CreateBusSchema,
  CreateDriverSchema,
  driverPhotoError,
} from "@/lib/validators/fleet-resources";
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
const busInput = {
  branchId: 2,
  plateNumber: "C123ABC",
  brand: "Marca",
  color: "Azul",
  model: 2025,
  year_manufacture: 2024,
  seatRows: 12,
  seatColumns: 4,
  currentKm: 100,
};
const savedBus = {
  id: 4,
  plateNumber: "C123ABC",
  brand: "Marca",
  model: "2025",
  yearManufacture: 2024,
  capacity: 48,
  currentKm: 100,
  seatRows: 12,
  seatColumns: 4,
  state: "AVAILABLE",
  photo: "https://storage.googleapis.com/test-bucket/bus.png",
};
const driverInput = {
  branchId: 2,
  name: "Ana",
  lastName: "Lopez",
  dpi: "1234567890123",
  nit: "1234567",
  phone: "55555555",
  baseSalary: 5000,
  email: "ana@example.com",
  adress: "Centro",
  license: { number: "LIC-1", expirationDate: "2030-12-31", licenseType: 1 },
};
const opId = "550e8400-e29b-41d4-a716-446655440000";
const savedDriver = {
  id: 31,
  name: "Ana",
  lastName: "Lopez",
  email: "ana@example.com",
  status: "PENDING",
  pendingOperationId: opId,
};
function busRequest(body: unknown, origin = "http://localhost:3000") {
  const form = new FormData();
  form.append(
    "request",
    new Blob([JSON.stringify(body)], { type: "application/json" }),
    "request.json",
  );
  form.append(
    "photo",
    new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], {
      type: "image/png",
    }),
    "bus.png",
  );
  return new NextRequest("http://localhost:3000/api/branch-admin/buses", {
    method: "POST",
    headers: { Origin: origin },
    body: form,
  });
}
function driverRequest(data: unknown = driverInput, photo = true) {
  const body = new FormData();
  body.append(
    "request",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
    "request.json",
  );
  if (photo)
    body.append(
      "photo",
      new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], {
        type: "image/png",
      }),
      "foto.png",
    );
  return new NextRequest("http://localhost:3000/api/branch-admin/drivers", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
    body,
  });
}
const operationContext = (id = "31") => ({ params: Promise.resolve({ id, operationId: opId }) });
const operationRequest = () =>
  new NextRequest(
    "http://localhost:3000/api/branch-admin/drivers/31/operations/" + opId + "?branchId=2",
  );
describe("Alta de buses y choferes por sucursal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((name: string) => ({
      value: name === "access_token" ? "private-token" : "2",
    }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("calcula la capacidad y valida filas, columnas y kilometraje del DTO", () => {
    expect(CreateBusSchema.parse({ ...busInput, capacity: 999 }).capacity).toBe(48);
    for (const changed of [
      { seatRows: 31 },
      { seatColumns: 7 },
      { currentKm: 0 },
      { model: 1979 },
      { seatRows: 1.5 },
    ])
      expect(CreateBusSchema.safeParse({ ...busInput, ...changed }).success).toBe(false);
    expect(CreateDriverSchema.safeParse({ ...driverInput, baseSalary: -1 }).success).toBe(false);
    expect(
      CreateDriverSchema.safeParse({
        ...driverInput,
        license: { ...driverInput.license, expirationDate: "2030-02-30" },
      }).success,
    ).toBe(false);
    expect(driverPhotoError({ size: 2 * 1024 * 1024, type: "image/png" })).toContain("1 MB");
    expect(driverPhotoError({ size: 20, type: "text/plain" })).toContain("JPG");
  });
  it("crea un bus con Bearer, sucursal vigente y capacidad calculada", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(savedBus, { status: 201 }));
    const response = await createBus(busRequest({ ...busInput, capacity: 999 }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ bus: savedBus, branchId: 2 });
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/api\/v1\/buses$/);
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(JSON.parse(await options.body.get("request").text())).toMatchObject({
      branchId: 2,
      capacity: 48,
    });
    expect(options.body.get("photo").size).toBe(12);
  });
  it("bloquea otro rol, sucursal cambiada y falta de seleccion", async () => {
    expect((await createBus(busRequest({ ...busInput, branchId: 1 }))).status).toBe(409);
    mocks.get.mockImplementation((name: string) =>
      name === "access_token" ? { value: "private-token" } : undefined,
    );
    expect((await createBus(busRequest(busInput))).status).toBe(400);
    mocks.session.mockResolvedValue({ ...user, role: { id: 2, name: "CUSTOMER" } });
    expect((await createBus(busRequest(busInput))).status).toBe(403);
    expect((await createDriver(driverRequest())).status).toBe(403);
    expect((await licenseTypes()).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("valida origen y datos sin llamar al gateway", async () => {
    expect((await createBus(busRequest(busInput, "https://otro.example"))).status).toBe(403);
    expect((await createBus(busRequest({ ...busInput, seatRows: 0 }))).status).toBe(400);
    expect((await createDriver(driverRequest(driverInput, false))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("envia al chofer como multipart y conserva el registro pendiente", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(savedDriver, { status: 202 }));
    const response = await createDriver(driverRequest());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ driver: savedDriver, branchId: 2 });
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/api\/v1\/drivers$/);
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
    expect(JSON.parse(await options.body.get("request").text())).toEqual(driverInput);
    expect(options.body.get("request").type).toBe("application/json");
    expect(options.body.get("photo").size).toBe(12);
  });
  it("rechaza un archivo con MIME de imagen pero contenido incorrecto", async () => {
    const body = new FormData();
    body.append("request", JSON.stringify(driverInput));
    body.append("photo", new Blob(["texto"], { type: "image/png" }), "foto.png");
    expect(
      (
        await createDriver(
          new NextRequest("http://localhost:3000/api/branch-admin/drivers", {
            method: "POST",
            headers: { Origin: "http://localhost:3000" },
            body,
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("consulta los tipos reales de licencia", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ id: 1, name: "A" }]));
    const response = await licenseTypes();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: "A" }]);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/licenses\/types$/);
  });
  it("verifica pertenencia antes de consultar la confirmacion", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ id: 31 }])).mockResolvedValueOnce(
      Response.json({
        driverId: 31,
        operationId: opId,
        action: "CREATE",
        status: "COMPLETED",
        failureReason: null,
      }),
    );
    const response = await operation(operationRequest(), operationContext());
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("COMPLETED");
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/branches\/2\/drivers$/);
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValueOnce(Response.json([{ id: 99 }]));
    expect((await operation(operationRequest(), operationContext())).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("conserva conflictos y no confirma una respuesta inesperada", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ detail: "Placa duplicada" }, { status: 409 }),
    );
    expect((await createBus(busRequest(busInput))).status).toBe(409);
    mocks.fetch.mockResolvedValueOnce(Response.json({}));
    expect((await createBus(busRequest(busInput))).status).toBe(502);
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ ...savedDriver, pendingOperationId: null }, { status: 202 }),
    );
    expect((await createDriver(driverRequest())).status).toBe(502);
  });

  it("lista buses y choferes solo desde la sucursal seleccionada", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([savedBus]));
    const buses = await listBuses(
      new NextRequest("http://localhost:3000/api/branch-admin/buses?branchId=2"),
    );
    expect(buses.status).toBe(200);
    expect(await buses.json()).toEqual({ items: [savedBus], branchId: 2 });
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/branches\/2\/buses$/);
    mocks.fetch.mockResolvedValueOnce(
      Response.json([
        {
          ...savedDriver,
          phone: "55555555",
          baseSalary: 5000,
          number: "LIC-1",
          expirationDate: "2030-12-31",
          licenseTypeName: "A",
        },
      ]),
    );
    const drivers = await listDrivers(
      new NextRequest("http://localhost:3000/api/branch-admin/drivers?branchId=2"),
    );
    expect(drivers.status).toBe(200);
    expect((await drivers.json()).items[0]).toMatchObject({
      id: 31,
      status: "PENDING",
      number: "LIC-1",
    });
    expect(mocks.fetch.mock.calls[1]?.[0]).toMatch(/\/api\/v1\/branches\/2\/drivers$/);
  });
  it("no consulta otra sucursal ni permite listar con otro rol", async () => {
    expect(
      (await listBuses(new NextRequest("http://localhost:3000/api/branch-admin/buses?branchId=1")))
        .status,
    ).toBe(409);
    expect(
      (
        await listDrivers(
          new NextRequest("http://localhost:3000/api/branch-admin/drivers?branchId=999"),
        )
      ).status,
    ).toBe(409);
    mocks.session.mockResolvedValue({ ...user, role: { id: 2, name: "CUSTOMER" } });
    expect(
      (await listBuses(new NextRequest("http://localhost:3000/api/branch-admin/buses?branchId=2")))
        .status,
    ).toBe(403);
    expect(
      (
        await listDrivers(
          new NextRequest("http://localhost:3000/api/branch-admin/drivers?branchId=2"),
        )
      ).status,
    ).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("acepta listados vacios y datos anteriores sin distribucion de asientos", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([]));
    expect(
      await (
        await listDrivers(
          new NextRequest("http://localhost:3000/api/branch-admin/drivers?branchId=2"),
        )
      ).json(),
    ).toEqual({ items: [], branchId: 2 });
    mocks.fetch.mockResolvedValueOnce(
      Response.json([{ ...savedBus, currentKm: 0, seatRows: null, seatColumns: null }]),
    );
    const buses = await listBuses(
      new NextRequest("http://localhost:3000/api/branch-admin/buses?branchId=2"),
    );
    expect(buses.status).toBe(200);
    expect((await buses.json()).items[0]).toMatchObject({ currentKm: 0, seatRows: null });
  });
  it("conserva registros rechazados o pendientes sin referencia y rechaza respuestas invalidas", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json([
        {
          ...savedDriver,
          status: "ACCOUNT_REJECTED",
          pendingOperationId: null,
          failureReason: "Correo registrado",
        },
        { ...savedDriver, id: 32, pendingOperationId: null },
      ]),
    );
    const drivers = await listDrivers(
      new NextRequest("http://localhost:3000/api/branch-admin/drivers?branchId=2"),
    );
    expect(drivers.status).toBe(200);
    expect((await drivers.json()).items).toHaveLength(2);
    mocks.fetch.mockResolvedValueOnce(Response.json({ content: [savedBus] }));
    expect(
      (await listBuses(new NextRequest("http://localhost:3000/api/branch-admin/buses?branchId=2")))
        .status,
    ).toBe(502);
  });
});

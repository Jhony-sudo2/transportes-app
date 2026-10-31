// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as createBus } from "@/app/api/branch-admin/buses/route";
import { PUT } from "@/app/api/branch-admin/buses/[id]/route";
import { middleware } from "@/middleware";
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
const update = {
  branchId: 2,
  color: "Azul",
  plateNumber: "C123ABC",
  brand: "Marca",
  model: 2025,
  yearManufacture: 2024,
  capacity: 48,
  seatRows: 12,
  seatColumns: 4,
};
const bus = {
  id: 4,
  plateNumber: "C123ABC",
  brand: "Marca",
  color: "Azul",
  model: "2025",
  yearManufacture: 2024,
  capacity: 48,
  currentKm: 100,
  seatRows: 12,
  seatColumns: 4,
  state: "AVAILABLE",
  photo: "https://storage.googleapis.com/test/bus.png",
};
const image = () =>
  new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], { type: "image/png" });
const context = (id = "4") => ({ params: Promise.resolve({ id }) });
function request(
  data: unknown = update,
  photo: Blob | null = null,
  origin = "http://localhost:3000",
  create = false,
) {
  const body = new FormData();
  body.append(
    create ? "request" : "data",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
    "data.json",
  );
  if (photo) body.append("photo", photo, "photo.png");
  return new NextRequest(`http://localhost:3000/api/branch-admin/buses${create ? "" : "/4"}`, {
    method: create ? "POST" : "PUT",
    headers: { Origin: origin },
    body,
  });
}
describe("Buses con fotografía y actualización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((name: string) => ({
      value: name === "access_token" ? "private-token" : "2",
    }));
    mocks.fetch.mockImplementation(async (_url: string, options: RequestInit) =>
      Response.json(options.method === "GET" ? [bus] : bus),
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it("actualiza sin foto usando data, PUT y el DTO vigente, conservando la imagen", async () => {
    const response = await PUT(request(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ item: bus, branchId: 2 });
    const [url, options] = mocks.fetch.mock.calls[1]!;
    expect(url).toMatch(/\/buses\/4$/);
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
    const { branchId: _branchId, ...expected } = update;
    expect(JSON.parse(await options.body.get("data").text())).toEqual(expected);
    expect(options.body.get("data").type).toBe("application/json");
    expect(options.body.has("request")).toBe(false);
    expect(options.body.has("photo")).toBe(false);
  });
  it("envía una foto nueva y muestra la URL devuelta", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([bus]))
      .mockResolvedValueOnce(
        Response.json({ ...bus, photo: "https://storage.googleapis.com/test/new.png" }),
      );
    const response = await PUT(request(update, image()), context());
    expect(response.status).toBe(200);
    expect((await response.json()).item.photo).toContain("new.png");
    const sent = mocks.fetch.mock.calls[1]?.[1].body;
    expect(sent.get("photo").type).toBe("image/png");
    expect(sent.get("photo").size).toBe(12);
  });
  it("verifica la sucursal antes de modificar un bus ajeno", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...bus, id: 99 }]));
    expect((await PUT(request(), context())).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([null, { ...user, isActive: false }])("requiere sesión activa %j", async (session) => {
    mocks.session.mockResolvedValue(session);
    expect((await PUT(request(), context())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])("rechaza otro rol %s", async (name) => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 1, name } });
    expect((await PUT(request(), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza origen externo y cambio de sucursal seleccionada", async () => {
    expect((await PUT(request(update, null, "https://otro.example"), context())).status).toBe(403);
    expect((await PUT(request({ ...update, branchId: 1 }), context())).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "abc", "9007199254740992"])("valida el identificador %s", async (id) => {
    expect((await PUT(request(), context(id))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    { currentKm: 500 },
    { state: "AVAILABLE" },
    { photo: "https://otro.example/1.png" },
    { userId: 9 },
    { color: "x".repeat(31) },
    { plateNumber: "x".repeat(21) },
    { capacity: 0 },
    { seatRows: 31 },
  ])("rechaza campos ajenos al DTO y valores inválidos %j", async (change) => {
    expect((await PUT(request({ ...update, ...change }), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    new Blob(["texto"], { type: "image/png" }),
    new Blob(["texto"], { type: "text/plain" }),
  ])("rechaza una fotografía inválida", async (photo) => {
    expect((await PUT(request(update, photo), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza la imagen que excede 1 MB", async () => {
    expect(
      (
        await PUT(
          request(update, new Blob([new Uint8Array(1024 * 1024 + 1)], { type: "image/png" })),
          context(),
        )
      ).status,
    ).toBe(413);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("exige foto al crear y rechaza el antiguo JSON", async () => {
    const create = {
      branchId: 2,
      color: "Azul",
      plateNumber: "C123ABC",
      brand: "Marca",
      model: 2025,
      year_manufacture: 2024,
      seatRows: 12,
      seatColumns: 4,
      currentKm: 100,
    };
    expect((await createBus(request(create, null, "http://localhost:3000", true))).status).toBe(
      400,
    );
    const old = new NextRequest("http://localhost:3000/api/branch-admin/buses", {
      method: "POST",
      headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
      body: JSON.stringify(create),
    });
    expect((await createBus(old)).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("conserva el motivo de rechazo del servicio", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([bus]))
      .mockResolvedValueOnce(
        Response.json({ detail: "El bus tiene viajes pendientes" }, { status: 409 }),
      );
    const response = await PUT(request(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toBe("El bus tiene viajes pendientes");
  });
  it.each([{ id: 99 }, { capacity: 49 }, { plateNumber: "C999ZZZ" }, { photo: null }])(
    "no confirma una actualización distinta %j",
    async (change) => {
      mocks.fetch
        .mockResolvedValueOnce(Response.json([bus]))
        .mockResolvedValueOnce(Response.json({ ...bus, ...change }));
      expect((await PUT(request(update, image()), context())).status).toBe(502);
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
    },
  );
  it("no reenvía la modificación tras un fallo de red", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([bus]))
      .mockRejectedValueOnce(new Error("timeout"));
    expect((await PUT(request(), context())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("habilita la edición en middleware sin caché", () => {
    const response = middleware(request());
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

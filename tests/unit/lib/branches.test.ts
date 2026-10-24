import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/branches/route";
import { GET as detail, PUT as update } from "@/app/api/admin/branches/[id]/route";
import { GET as locations } from "@/app/api/admin/locations/route";
import { CreateBranchSchema, getBranchCoordinate, roundCoordinate } from "@/lib/validators/branch";
const mocks = vi.hoisted(() => ({ session: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "private-token" }) }),
}));
const admin = {
  id: 1,
  name: "Ana",
  lastName: "Perez",
  email: "ana@example.com",
  role: { id: 1, name: "ADMIN" },
  isActive: true,
  resetPassword: false,
};
const input = {
  name: "Centro",
  phone: "55555555",
  direction: {
    municipalityId: 7,
    latitude: 14.6349151,
    longitude: -90.5068821,
    indication: "Zona 1",
  },
};
const saved = {
  id: 2,
  name: input.name,
  phone: input.phone,
  latitude: input.direction.latitude,
  longitude: input.direction.longitude,
  municipalityName: "Guatemala",
  departamentName: "Guatemala",
  indication: "Zona 1",
};
function request(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
function context(id = "2") {
  return { params: Promise.resolve({ id }) };
}
function updateRequest(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/branches/2", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
describe("Sucursales y coordenadas decimales", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(admin);
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("exige seleccionar coordenadas y valida rangos, finitud y municipio", () => {
    expect(CreateBranchSchema.safeParse(input).success).toBe(true);
    for (const delta of [
      { latitude: 91 },
      { longitude: -181 },
      { latitude: Number.NaN },
      { latitude: "" },
      { municipalityId: 0 },
      { latitude: undefined },
    ])
      expect(
        CreateBranchSchema.safeParse({ ...input, direction: { ...input.direction, ...delta } })
          .success,
      ).toBe(false);
  });
  it("conserva cero, negativos y precision de siete decimales", () => {
    expect(
      CreateBranchSchema.safeParse({
        ...input,
        direction: { ...input.direction, latitude: 0, longitude: 0 },
      }).success,
    ).toBe(true);
    expect(roundCoordinate({ latitude: 14.634915123, longitude: -90.506882156 })).toEqual({
      latitude: 14.6349151,
      longitude: -90.5068822,
    });
  });
  it("omite del mapa coordenadas ausentes o fuera de rango", () => {
    expect(getBranchCoordinate({ ...saved, latitude: null })).toBeNull();
    expect(getBranchCoordinate({ ...saved, longitude: 999 })).toBeNull();
    expect(getBranchCoordinate(saved)).toEqual({
      latitude: saved.latitude,
      longitude: saved.longitude,
    });
  });
  it("verifica sesion y rol para consultar, guardar y cargar catalogos", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    mocks.session.mockResolvedValue({ ...admin, role: { id: 2, name: "CUSTOMER" } });
    expect((await GET()).status).toBe(403);
    expect((await POST(request(input))).status).toBe(403);
    expect(
      (await locations(new NextRequest("http://localhost:3000/api/admin/locations"))).status,
    ).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("envia las coordenadas exactas y Bearer al gateway", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(saved, { status: 201 }));
    const result = await POST(request(input));
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual(saved);
    const options = mocks.fetch.mock.calls[0]?.[1];
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(JSON.parse(options.body)).toEqual(input);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/branches$/);
  });
  it("rechaza origen externo y coordenadas invalidas sin mutaciones", async () => {
    expect((await POST(request(input, "https://otro.example"))).status).toBe(403);
    expect(
      (await POST(request({ ...input, direction: { ...input.direction, latitude: 999 } }))).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("carga sucursales del backend incluyendo registros sin ubicacion", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json([saved, { ...saved, id: 3, latitude: null, longitude: null }]),
    );
    const result = await GET();
    expect(result.status).toBe(200);
    expect(await result.json()).toHaveLength(2);
  });
  it("consulta municipios del departamento elegido y valida el id", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ id: 7, name: "Guatemala" }]));
    const result = await locations(
      new NextRequest("http://localhost:3000/api/admin/locations?departmentId=1"),
    );
    expect(result.status).toBe(200);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/directions\/departments\/1\/municipalities$/);
    mocks.fetch.mockClear();
    expect(
      (
        await locations(
          new NextRequest("http://localhost:3000/api/admin/locations?departmentId=../users"),
        )
      ).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("mantiene conflictos y no confirma respuestas de alta inesperadas", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({}, { status: 409 }));
    expect((await POST(request(input))).status).toBe(409);
    mocks.fetch.mockResolvedValueOnce(Response.json({ id: 2 }));
    expect((await POST(request(input))).status).toBe(502);
  });

  it("carga el detalle con identificadores de municipio y departamento", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ ...saved, municipalityId: 7, departamentId: 1 }),
    );
    const result = await detail(
      new NextRequest("http://localhost:3000/api/admin/branches/2"),
      context(),
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ id: 2, municipalityId: 7, departamentId: 1 });
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/branches\/2$/);
    expect(mocks.fetch.mock.calls[0]?.[1].method).toBe("GET");
  });
  it("actualiza por PUT con Bearer y conserva los decimales", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(saved));
    const result = await update(updateRequest(input), context());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(saved);
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/api\/v1\/branches\/2$/);
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(JSON.parse(options.body)).toEqual(input);
  });
  it("protege detalle y actualizacion frente a sesiones ausentes y otros roles", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await update(updateRequest(input), context())).status).toBe(401);
    mocks.session.mockResolvedValue({ ...admin, role: { id: 2, name: "CUSTOMER" } });
    expect((await update(updateRequest(input), context())).status).toBe(403);
    expect(
      (await detail(new NextRequest("http://localhost:3000/api/admin/branches/2"), context()))
        .status,
    ).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("valida origen, id, JSON y coordenadas antes de actualizar", async () => {
    expect((await update(updateRequest(input, "https://otro.example"), context())).status).toBe(
      403,
    );
    for (const id of ["abc", "0", "-1", "9007199254740992"]) {
      expect((await update(updateRequest(input), context(id))).status).toBe(400);
    }
    expect(
      (
        await update(
          updateRequest({ ...input, direction: { ...input.direction, latitude: 91 } }),
          context(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await update(
          new NextRequest("http://localhost:3000/api/admin/branches/2", {
            method: "PUT",
            headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
            body: "{",
          }),
          context(),
        )
      ).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("mantiene errores de Fleet y no confirma una respuesta de otra sucursal", async () => {
    for (const status of [404, 409]) {
      mocks.fetch.mockResolvedValueOnce(Response.json({}, { status }));
      expect((await update(updateRequest(input), context())).status).toBe(status);
    }
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...saved, id: 99 }));
    expect((await update(updateRequest(input), context())).status).toBe(502);
    mocks.fetch.mockResolvedValueOnce(Response.json({}));
    expect((await update(updateRequest(input), context())).status).toBe(502);
  });
});

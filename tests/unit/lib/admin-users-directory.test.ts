// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "@/app/api/admin/users/route";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
const admin = { id: 1, isActive: true, resetPassword: false, role: { id: 1, name: "ADMIN" } };
// Forma real de /users/staff: sin correo ni nombre.
const staff = [
  { userId: 9, role: "SUCURSAL_ADMIN", branchIds: [2], active: true },
  { userId: 10, role: "CASHIER", branchIds: [3], active: false },
];
const directoryUser = (id: number, email: string, name: string, lastName: string) => ({
  id,
  customerId: null,
  email,
  emailVerified: true,
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  twoFactorEnabled: false,
  resetPassword: false,
  name,
  lastName,
  phone: "5555-5555",
  address: "Zona 1",
  nit: "CF",
  dpi: "NO-DEBE-SALIR",
  branchIds: [],
});
const page = (content: unknown[], number = 0, totalPages = 1) => ({
  content,
  page: number,
  size: 200,
  totalElements: content.length,
  totalPages,
});
const request = (query = "") => new NextRequest("http://localhost:3000/api/admin/users" + query);
let directory: Record<number, unknown>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.session.mockResolvedValue(admin);
  mocks.cookie.mockReturnValue({ value: "private-token" });
  directory = {
    0: page([directoryUser(9, "ana@example.com", "Ana", "López")]),
  };
  mocks.fetch.mockImplementation(async (url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/users/staff")) return Response.json(staff);
    if (parsed.pathname.endsWith("/api/v1/users")) {
      const body = directory[Number(parsed.searchParams.get("page"))];
      return body instanceof Response ? body : Response.json(body ?? page([]));
    }
    return Response.json({ detail: "No previsto" }, { status: 500 });
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Listado de usuarios: correo y nombre desde el directorio /users", () => {
  it("completa correo y nombre que /users/staff no entrega", async () => {
    const response = await list(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.content[0]).toMatchObject({
      id: 9,
      email: "ana@example.com",
      name: "Ana",
      lastName: "López",
    });
    // El usuario 10 no está en el directorio: se muestra sin correo, sin romper el listado.
    expect(body.content[1]).toMatchObject({ id: 10, email: "" });
    expect(JSON.stringify(body)).not.toContain("NO-DEBE-SALIR");
  });
  it("consulta el directorio como ADMIN, paginado y con el token en el encabezado", async () => {
    await list(request());
    const call = mocks.fetch.mock.calls.find(([url]) => /\/api\/v1\/users\?/.test(url));
    expect(call).toBeDefined();
    const url = new URL(String(call?.[0]));
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("200");
    expect(call?.[1].headers.Authorization).toBe("Bearer private-token");
  });
  it("recorre todas las páginas del directorio", async () => {
    directory = {
      0: page([directoryUser(9, "ana@example.com", "Ana", "López")], 0, 2),
      1: page([directoryUser(10, "caja@example.com", "Carlos", "Caja")], 1, 2),
    };
    const body = await (await list(request())).json();
    expect(body.content.map((u: { email: string }) => u.email)).toEqual([
      "ana@example.com",
      "caja@example.com",
    ]);
  });
  it("permite buscar por correo una vez completado", async () => {
    directory = {
      0: page([
        directoryUser(9, "ana@example.com", "Ana", "López"),
        directoryUser(10, "caja@example.com", "Carlos", "Caja"),
      ]),
    };
    const response = await list(request("?email=CAJA"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalElements).toBe(1);
    expect(body.content[0]).toMatchObject({ id: 10, email: "caja@example.com" });
  });
  it("si el directorio falla, muestra el listado sin correo en lugar de un error", async () => {
    directory = { 0: Response.json({ detail: "caído" }, { status: 503 }) };
    const response = await list(request());
    expect(response.status).toBe(200);
    expect((await response.json()).content.map((u: { email: string }) => u.email)).toEqual([
      "",
      "",
    ]);
  });
  it("si el directorio falla, la búsqueda por correo avisa que no está disponible", async () => {
    directory = { 0: Response.json({ detail: "caído" }, { status: 503 }) };
    expect((await list(request("?email=ana"))).status).toBe(422);
  });
  it("rechaza un directorio con formato inesperado sin romper el listado", async () => {
    directory = { 0: { content: "no-es-lista" } };
    const response = await list(request());
    expect(response.status).toBe(200);
    expect((await response.json()).content[0].email).toBe("");
  });
  it("no consulta el directorio si /users/staff ya trae correo y nombre", async () => {
    mocks.fetch.mockImplementation(async () =>
      Response.json([{ ...staff[0], email: "ana@example.com", name: "Ana", lastName: "López" }]),
    );
    const body = await (await list(request())).json();
    expect(body.content[0].email).toBe("ana@example.com");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

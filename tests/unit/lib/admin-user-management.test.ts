// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "@/app/api/admin/users/route";
import { GET as branches, POST as assign } from "@/app/api/admin/users/[id]/branches/route";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
const admin = { id: 1, isActive: true, resetPassword: false, role: { id: 1, name: "ADMIN" } };
const user = {
  id: 9,
  name: "Ana",
  lastName: "López",
  email: "ana@example.com",
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  branchIds: [2],
};
const page = { content: [user], page: 0, size: 10, totalElements: 1, totalPages: 1 };
const context = (id = "9") => ({ params: Promise.resolve({ id }) });
const request = (query = "") => new NextRequest("http://localhost:3000/api/admin/users" + query);
const branchRequest = () => new NextRequest("http://localhost:3000/api/admin/users/9/branches");
function post(body: unknown = { branchId: 3 }, origin = "http://localhost:3000") {
  return new NextRequest(branchRequest().url, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Listado de usuarios y asignación desde ADMIN", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(admin);
    mocks.cookie.mockReturnValue({ value: "private-token" });
    mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
      if (options.method === "POST") return new Response(null, { status: 204 });
      return Response.json(url.includes("/branches") ? [2] : page);
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("consulta una página real con correo escapado y orden fijo", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...page, page: 1 }));
    const response = await list(
      request("?page=1&email=ana%2Bventas%40example.com&size=100&sortBy=password"),
    );
    expect(response.status).toBe(200);
    const [url, options] = mocks.fetch.mock.calls[0]!;
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      page: "1",
      size: "10",
      sortBy: "id",
      ascending: "false",
      email: "ana+ventas@example.com",
    });
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.cache).toBe("no-store");
  });
  it("devuelve los campos necesarios del usuario sin exponer otros datos", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ ...page, content: [{ ...user, dpi: "private", password: "private" }] }),
    );
    expect(await (await list(request())).json()).toEqual(page);
  });
  it("normaliza CASHIER para mostrar su rol", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ ...page, content: [{ ...user, role: { id: 5, name: "CASHIER" } }] }),
    );
    expect((await (await list(request())).json()).content[0].role.name).toBe("CAJERO");
  });
  it.each(["?page=-1", "?page=abc", "?page=1.5", "?page=2147483648", "?email=" + "x".repeat(256)])(
    "rechaza parámetros inválidos: %s",
    async (query) => {
      expect((await list(request(query))).status).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("acepta el listado vacío paginado", async () => {
    const empty = { ...page, content: [], totalElements: 0, totalPages: 0 };
    mocks.fetch.mockResolvedValueOnce(Response.json(empty));
    expect(await (await list(request())).json()).toEqual(empty);
  });
  it.each([
    { content: [user] },
    { ...page, page: 2 },
    { ...page, content: [{ id: 9 }] },
    { ...page, size: 20 },
  ])("no presenta respuestas de listado inválidas: %j", async (response) => {
    mocks.fetch.mockResolvedValueOnce(Response.json(response));
    expect((await list(request())).status).toBe(502);
  });
  it("consulta las sucursales del usuario seleccionado", async () => {
    expect(await (await branches(branchRequest(), context())).json()).toEqual([2]);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/users\/9\/branches$/);
  });
  it("asigna con el DTO actual del servicio y acepta 204 sin JSON", async () => {
    const response = await assign(post(), context());
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const [url, options] = mocks.fetch.mock.calls[0]!;
    expect(url).toMatch(/users\/branch-administrators$/);
    expect(JSON.parse(options.body)).toEqual({ userId: 9, branchId: 3 });
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["SUCURSAL_ADMIN", "CAJERO", "CUSTOMER", "DRIVER"])(
    "impide a %s listar o asignar usuarios",
    async (name) => {
      mocks.session.mockResolvedValue({ ...admin, role: { id: 3, name } });
      expect((await list(request())).status).toBe(403);
      expect((await branches(branchRequest(), context())).status).toBe(403);
      expect((await assign(post(), context())).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([null, { ...admin, isActive: false }])("requiere sesión activa: %j", async (session) => {
    mocks.session.mockResolvedValue(session);
    expect((await list(request())).status).toBe(401);
    expect((await assign(post(), context())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("requiere token y contraseña inicial resuelta", async () => {
    mocks.cookie.mockReturnValue(undefined);
    expect((await list(request())).status).toBe(401);
    mocks.cookie.mockReturnValue({ value: "token" });
    mocks.session.mockResolvedValue({ ...admin, resetPassword: true });
    expect((await assign(post(), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza un origen externo antes de escribir", async () => {
    expect((await assign(post({ branchId: 3 }, "https://otro.example"), context())).status).toBe(
      403,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { branchId: 0 },
    { branchId: "3" },
    { branchId: 3, userId: 100 },
    { branchId: 3, roleId: 1 },
  ])("rechaza otro usuario o datos inválidos: %j", async (input) => {
    expect((await assign(post(input), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "abc", "9007199254740992"])("valida el usuario %s", async (id) => {
    expect((await branches(branchRequest(), context(id))).status).toBe(400);
    expect((await assign(post(), context(id))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("muestra el rechazo del servicio sin cambiar sus reglas", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ detail: "El usuario ya tiene una sucursal asignada" }, { status: 409 }),
    );
    const response = await assign(post(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toBe("El usuario ya tiene una sucursal asignada");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["timeout", "server-error", "unexpected-success"])(
    "no reenvía una asignación de resultado incierto: %s",
    async (failure) => {
      if (failure === "timeout") mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
      else
        mocks.fetch.mockResolvedValueOnce(
          Response.json({}, { status: failure === "server-error" ? 503 : 200 }),
        );
      const response = await assign(post(), context());
      expect(response.status).toBe(failure === "server-error" ? 503 : 502);
      expect((await response.json()).detail).toContain("Actualiza");
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("habilita las nuevas rutas sin caché", () => {
    for (const path of ["/system-admin/users/new", "/api/admin/users/9/branches"]) {
      const response = middleware(new NextRequest("http://localhost:3000" + path));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});

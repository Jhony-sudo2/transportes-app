import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { CreateAdminUserSchema } from "@/lib/validators/admin-user";
import { POST } from "@/app/api/admin/users/route";
import { GET as getRoles } from "@/app/api/admin/roles/route";
const mocks = vi.hoisted(() => ({ session: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "private-token" }) }),
}));
const admin = {
  id: 1,
  name: "Ana",
  lastName: "Perez",
  email: "admin@example.com",
  role: { id: 1, name: "ADMIN" },
  isActive: true,
  twoFactorEnabled: false,
  resetPassword: false,
};
const input = {
  person: {
    name: "Juan",
    lastName: "Perez",
    dpi: "1234567890123",
    nit: "1234567",
    phone: "55555555",
    adress: "Guatemala",
  },
  email: "juan@example.com",
  roleId: 5,
};
const roles = [
  { id: 1, name: "ADMIN" },
  { id: 2, name: "CUSTOMER" },
  { id: 3, name: "SUCURSAL_ADMIN" },
  { id: 4, name: "DRIVER" },
  { id: 5, name: "CAJERO" },
];
function request(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
describe("Creacion administrativa de usuarios", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(admin);
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("no permite choferes ni datos incompletos", () => {
    expect(CreateAdminUserSchema.safeParse({ ...input, roleId: 4 }).success).toBe(false);
    expect(
      CreateAdminUserSchema.safeParse({ ...input, person: { ...input.person, name: "  " } })
        .success,
    ).toBe(false);
  });
  it("requiere sesion y rol ADMIN", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request(input))).status).toBe(401);
    mocks.session.mockResolvedValue({ ...admin, role: { id: 2, name: "CUSTOMER" } });
    expect((await POST(request(input))).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("bloquea solicitudes externas y validacion fallida", async () => {
    expect((await POST(request(input, "https://otro.example"))).status).toBe(403);
    expect((await POST(request({ ...input, roleId: 4 }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("consulta roles del backend y excluye choferes", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(roles));
    const response = await getRoles();
    expect(response.status).toBe(200);
    expect((await response.json()).map((role: { id: number }) => role.id)).toEqual([1, 2, 3, 5]);
  });
  it("crea un cajero sin contrasena y envia el token solo en el encabezado", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(roles))
      .mockResolvedValueOnce(
        Response.json(
          { ...admin, id: 8, name: "Juan", email: input.email, role: { id: 5, name: "CAJERO" } },
          { status: 201 },
        ),
      );
    const response = await POST(request({ ...input, password: "no enviar" }));
    expect(response.status).toBe(201);
    expect((await response.json()).user.role.name).toBe("CAJERO");
    expect(mocks.fetch.mock.calls[1]?.[1].headers.Authorization).toBe("Bearer private-token");
    expect(JSON.parse(mocks.fetch.mock.calls[1]?.[1].body)).toEqual(input);
  });
  it("rechaza un rol ausente del catalogo", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(roles.filter((role) => role.id !== 5)));
    expect((await POST(request(input))).status).toBe(400);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("conserva el conflicto de datos duplicados", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(roles))
      .mockResolvedValueOnce(Response.json({}, { status: 409 }));
    expect((await POST(request(input))).status).toBe(409);
  });
  it("no confirma respuestas incompletas del servicio", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(roles))
      .mockResolvedValueOnce(Response.json({ id: 8 }));
    expect((await POST(request(input))).status).toBe(502);
  });
});

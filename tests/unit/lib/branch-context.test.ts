import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/branch-admin/context/route";
import { clearAuthCookies, MANAGED_BRANCH_COOKIE } from "@/lib/auth/cookies";
import { resolveManagedBranchId } from "@/lib/validators/branch-context";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  fleet: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("@/lib/api/fleet", () => ({ fleetRequest: mocks.fleet }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set, delete: mocks.delete }),
}));
const user = {
  id: 3,
  name: "Ana",
  lastName: "Lopez",
  isActive: true,
  resetPassword: false,
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  branchIds: [2, 7],
};
function request(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/branch-admin/context", {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Contexto del administrador de sucursales", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((key: string) =>
      key === "access_token" ? { value: "private-token" } : undefined,
    );
    mocks.fleet.mockImplementation(async (path: string) => {
      const id = Number(path.split("/")[1]);
      return { id, name: id === 2 ? "Sede Central" : "Antigua", phone: "No exponer" };
    });
  });
  it("consulta solo las sucursales asignadas y devuelve id y nombre", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      branches: [
        { id: 2, name: "Sede Central" },
        { id: 7, name: "Antigua" },
      ],
      selectedBranchId: null,
    });
    expect(mocks.fleet.mock.calls).toEqual([
      ["branches/2", "private-token"],
      ["branches/7", "private-token"],
    ]);
  });
  it("recupera una seleccion valida y descarta cookies de sucursales ajenas", async () => {
    mocks.get.mockImplementation((key: string) => ({
      value: key === "access_token" ? "private-token" : "7",
    }));
    expect((await (await GET()).json()).selectedBranchId).toBe(7);
    mocks.get.mockImplementation((key: string) => ({
      value: key === "access_token" ? "private-token" : "999",
    }));
    expect((await (await GET()).json()).selectedBranchId).toBeNull();
  });
  it("selecciona una sede unica y maneja cuentas sin asignaciones", async () => {
    expect(resolveManagedBranchId([2], undefined)).toBe(2);
    expect(resolveManagedBranchId([2, 7], "invalid")).toBeNull();
    mocks.session.mockResolvedValue({ ...user, branchIds: [] });
    expect(await (await GET()).json()).toEqual({ branches: [], selectedBranchId: null });
    expect(mocks.fleet).not.toHaveBeenCalled();
  });
  it("exige sesion activa, rol de sucursal y clave actualizada", async () => {
    for (const invalid of [null, { ...user, isActive: false }]) {
      mocks.session.mockResolvedValue(invalid);
      expect((await GET()).status).toBe(401);
    }
    for (const invalid of [
      { ...user, role: { id: 1, name: "ADMIN" } },
      { ...user, resetPassword: true },
    ]) {
      mocks.session.mockResolvedValue(invalid);
      expect((await GET()).status).toBe(403);
      expect((await PUT(request({ branchId: 2 }))).status).toBe(403);
    }
    expect(mocks.fleet).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("guarda una seleccion autorizada en una cookie HTTP-only", async () => {
    const response = await PUT(request({ branchId: 7 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ selectedBranchId: 7 });
    expect(mocks.set).toHaveBeenCalledWith(
      MANAGED_BRANCH_COOKIE,
      "7",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    expect(mocks.fleet).not.toHaveBeenCalled();
  });
  it("no guarda sucursales ajenas ni datos invalidos", async () => {
    expect((await PUT(request({ branchId: 999 }))).status).toBe(403);
    for (const branchId of [0, -1, "2", 1.5, 9007199254740992])
      expect((await PUT(request({ branchId }))).status).toBe(400);
    expect(
      (
        await PUT(
          new NextRequest("http://localhost:3000/api/branch-admin/context", {
            method: "PUT",
            headers: { Origin: "http://localhost:3000" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("rechaza otro origen antes de consultar la sesion", async () => {
    expect((await PUT(request({ branchId: 2 }, "https://otro.example"))).status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("rechaza detalles que no correspondan a la sucursal solicitada", async () => {
    mocks.fleet.mockResolvedValue({ id: 99, name: "Otra" });
    expect((await GET()).status).toBe(502);
  });
  it("elimina la seleccion al cerrar la sesion", async () => {
    await clearAuthCookies();
    expect(mocks.delete).toHaveBeenCalledWith("access_token");
    expect(mocks.delete).toHaveBeenCalledWith(MANAGED_BRANCH_COOKIE);
  });
});

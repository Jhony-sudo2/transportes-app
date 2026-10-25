// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as salary } from "@/app/api/branch-admin/drivers/[id]/salary/route";
import { DELETE as remove } from "@/app/api/branch-admin/drivers/[id]/route";
import { DriverSalaryRequestSchema } from "@/lib/validators/fleet-resources";

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
  status: "ACTIVE",
  pendingOperationId: null,
  userId: 321,
  baseSalary: 5000,
};
const rejected = {
  ...driver,
  status: "ACCOUNT_REJECTED",
  userId: null,
  failureReason: "Correo registrado",
};
const input = { branchId: 2, baseSalary: 6123.45 };
const context = (id = "31") => ({ params: Promise.resolve({ id }) });
const salaryRequest = (data: unknown = input, origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/branch-admin/drivers/31/salary", {
    method: "PATCH",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
const deleteRequest = (branchId = 2, origin = "http://localhost:3000") =>
  new NextRequest(`http://localhost:3000/api/branch-admin/drivers/31?branchId=${branchId}`, {
    method: "DELETE",
    headers: { Origin: origin },
  });

describe("Salario y solicitudes rechazadas por sucursal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockImplementation((name: string) => ({
      value: name === "access_token" ? "private-token" : "2",
    }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("actualiza solo baseSalary con el Bearer y devuelve el registro confirmado", async () => {
    const changed = { ...driver, baseSalary: input.baseSalary };
    mocks.fetch
      .mockResolvedValueOnce(Response.json([driver]))
      .mockResolvedValueOnce(Response.json(changed));
    const response = await salary(salaryRequest(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ item: changed, branchId: 2 });
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/branches\/2\/drivers$/);
    const [url, options] = mocks.fetch.mock.calls[1] ?? [];
    expect(url).toMatch(/\/api\/v1\/drivers\/31\/salary$/);
    expect(options.method).toBe("PATCH");
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(JSON.parse(options.body)).toEqual({ baseSalary: 6123.45 });
  });

  it("valida salario positivo y finito sin aceptar cambios adicionales", async () => {
    for (const baseSalary of [0, -1, NaN, Infinity, "100", null])
      expect(DriverSalaryRequestSchema.safeParse({ ...input, baseSalary }).success).toBe(false);
    expect((await salary(salaryRequest({ ...input, baseSalary: 0 }), context())).status).toBe(400);
    expect(
      (await salary(salaryRequest({ ...input, email: "otro@example.com" }), context())).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { ...driver, status: "PENDING" },
    rejected,
    { ...driver, pendingOperationId: "op-1" },
    { ...driver, userId: null },
  ])("no edita salario de una identidad sin confirmar: %j", async (record) => {
    mocks.fetch.mockResolvedValueOnce(Response.json([record]));
    expect((await salary(salaryRequest(), context())).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("elimina solo un registro rechazado y confirma el 204 de Fleet", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([rejected]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await remove(deleteRequest(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedId: 31, branchId: 2 });
    const [url, options] = mocks.fetch.mock.calls[1] ?? [];
    expect(url).toMatch(/\/api\/v1\/drivers\/31$/);
    expect(options.method).toBe("DELETE");
    expect(options.body).toBeUndefined();
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).includes("/users/"))).toBe(false);
  });

  it.each([
    driver,
    { ...driver, status: "INACTIVE" },
    { ...rejected, status: "PENDING" },
    { ...rejected, userId: 321 },
    { ...rejected, pendingOperationId: "op-1" },
  ])("impide eliminar registros confirmados o pendientes: %j", async (record) => {
    mocks.fetch.mockResolvedValueOnce(Response.json([record]));
    expect((await remove(deleteRequest(), context())).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("rechaza otros roles, origen externo y una sucursal distinta", async () => {
    expect((await salary(salaryRequest(input, "https://otro.example"), context())).status).toBe(
      403,
    );
    expect((await remove(deleteRequest(2, "https://otro.example"), context())).status).toBe(403);
    expect((await salary(salaryRequest({ ...input, branchId: 1 }), context())).status).toBe(409);
    expect((await remove(deleteRequest(1), context())).status).toBe(409);
    mocks.session.mockResolvedValue({ ...user, role: { id: 2, name: "CUSTOMER" } });
    expect((await salary(salaryRequest(), context())).status).toBe(403);
    expect((await remove(deleteRequest(), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("verifica pertenencia antes de editar o eliminar", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([{ ...driver, id: 99 }]))
      .mockResolvedValueOnce(Response.json([{ ...rejected, id: 99 }]));
    expect((await salary(salaryRequest(), context())).status).toBe(403);
    expect((await remove(deleteRequest(), context())).status).toBe(403);
    expect(mocks.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });

  it("rechaza identificadores invalidos y falta de seleccion", async () => {
    expect((await remove(deleteRequest(), context("0"))).status).toBe(400);
    expect((await salary(salaryRequest(), context("no-valido"))).status).toBe(400);
    mocks.get.mockImplementation((name: string) =>
      name === "access_token" ? { value: "private-token" } : undefined,
    );
    expect((await remove(deleteRequest(), context())).status).toBe(400);
    expect((await salary(salaryRequest(), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { ...driver, baseSalary: 5000 },
    { ...driver, id: 99, baseSalary: input.baseSalary },
  ])("no confirma un salario o un registro incorrecto", async (record) => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([driver]))
      .mockResolvedValueOnce(Response.json(record));
    expect((await salary(salaryRequest(), context())).status).toBe(502);
  });

  it("conserva errores del servicio sin repetir modificaciones", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([rejected]))
      .mockResolvedValueOnce(
        Response.json({ detail: "La solicitud tiene una operación pendiente." }, { status: 409 }),
      );
    const response = await remove(deleteRequest(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("operación pendiente");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("no confirma la eliminacion si el servicio responde con otro contenido", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json([rejected]))
      .mockResolvedValueOnce(Response.json({ removed: false }));
    expect((await remove(deleteRequest(), context())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { refundGet, refundPost } from "@/lib/api/refunds";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const customer = {
  id: 7,
  isActive: true,
  resetPassword: false,
  role: { id: 2, name: "CUSTOMER" },
  branchIds: [],
};
const cashier = { ...customer, id: 9, role: { id: 5, name: "CAJERO" }, branchIds: [2] };
const invoice = {
  id: 10,
  branchId: 2,
  userId: 7,
  totalAmount: 50,
  paymentDate: "2026-10-26T12:00:00",
  typeInvoice: "TICKET_PAYMENT",
  state: "CANCELLED",
};
const branch = { branchId: 2, branchName: "Central" };
const ticket = {
  id: 11,
  invoiceId: 10,
  amount: 50,
  position: { row: 1, column: 2 },
  paymentDate: invoice.paymentDate,
};
const detail = { invoice, branchName: branch.branchName, tickets: [ticket] };
const transaction = {
  id: 21,
  transactionType: "REFUND",
  createdAt: invoice.paymentDate,
  amount: 50,
};
function request(
  actor = "customer",
  body: unknown = { invoiceId: 10 },
  origin = "http://localhost:3000",
) {
  return new NextRequest("http://localhost:3000/api/" + actor + "/refunds/10", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Devoluciones: acceso, sucursal y confirmación", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(customer);
    mocks.get.mockReturnValue({ value: "private-token" });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
      if (options.method === "POST") return Response.json(transaction, { status: 201 });
      if (url.endsWith("/payments/me")) return Response.json([invoice]);
      if (url.endsWith("/users/9/branches")) return Response.json([2]);
      if (url.endsWith("/branches/2")) return Response.json({ id: 2, name: "Central" });
      if (url.endsWith("/payments/10/tickets")) return Response.json([ticket]);
      return Response.json(invoice);
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("lista únicamente las facturas propias canceladas o reembolsadas", async () => {
    expect(await (await refundGet("customer")).json()).toEqual([invoice]);
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...invoice, userId: 8 }]));
    expect((await refundGet("customer")).status).toBe(403);
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...invoice, state: "PAID" }]));
    const filtered = await refundGet("customer");
    expect(filtered.status).toBe(200);
    expect(await filtered.json()).toEqual([]);
  });
  it("abona el importe consultado, sin aceptar identificadores de cuenta ni montos", async () => {
    const response = await refundPost(request(), "customer", "10");
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ transaction });
    const [url, options] = mocks.fetch.mock.calls[1]!;
    expect(url).toMatch(/refunds\/web$/);
    expect(JSON.parse(options.body)).toEqual({ invoiceId: 10 });
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.cache).toBe("no-store");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("exige branchId dentro de InvoiceResponse y rechaza el antiguo Summary", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ invoice, ...branch }]));
    expect((await refundGet("customer")).status).toBe(502);
    mocks.fetch.mockResolvedValueOnce(
      Response.json({
        ...invoice,
        branchId: undefined,
      }),
    );
    expect((await refundGet("customer", "10")).status).toBe(502);
  });
  it("completa el nombre de la sucursal en el BFF después de verificar la factura", async () => {
    expect(await (await refundGet("customer", "10")).json()).toEqual(detail);
    expect(mocks.fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/api/v1/payments/10",
      "/api/v1/payments/10/tickets",
      "/api/v1/branches/2",
    ]);
  });
  it("registra la devolución sin consultar Fleet para obtener un nombre", async () => {
    mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
      if (url.includes("/branches/")) throw new Error("Fleet no disponible");
      return Response.json(options.method === "POST" ? transaction : invoice);
    });
    expect((await refundPost(request(), "customer", "10")).status).toBe(201);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls.every(([url]) => !url.includes("/branches/"))).toBe(true);
  });
  it("resuelve la sucursal por la relación del cajero y permite compras sin cuenta", async () => {
    mocks.session.mockResolvedValue(cashier);
    expect(await (await refundGet("cashier")).json()).toEqual(branch);
    mocks.fetch.mockResolvedValueOnce(Response.json([2]));
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...invoice, userId: null }));
    expect((await refundGet("cashier", "10")).status).toBe(200);
    expect((await refundPost(request("cashier"), "cashier", "10")).status).toBe(201);
    const [url, options] = mocks.fetch.mock.calls.at(-1)!;
    expect(url).toMatch(/refunds\/in-person$/);
    expect(JSON.parse(options.body)).toEqual({ invoiceId: 10 });
  });
  it.each([
    { branchIds: [], status: 403 },
    { branchIds: [2, 3], status: 403 },
    { branchIds: null, status: 502 },
    { branchIds: [-1], status: 502 },
  ])("bloquea asignaciones no válidas del cajero: %j", async ({ branchIds, status }) => {
    mocks.session.mockResolvedValue(cashier);
    mocks.fetch.mockImplementation(async () => Response.json(branchIds));
    expect((await refundGet("cashier")).status).toBe(status);
    expect((await refundPost(request("cashier"), "cashier", "10")).status).toBe(status);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls.every(([url]) => url.endsWith("/users/9/branches"))).toBe(true);
  });
  it("consulta las sucursales del usuario autenticado y después Fleet, sin pasar por Commerce", async () => {
    mocks.session.mockResolvedValue({ ...cashier, branchIds: [99] });
    expect(await (await refundGet("cashier")).json()).toEqual(branch);
    expect(mocks.fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/api/v1/users/9/branches",
      "/api/v1/branches/2",
    ]);
    for (const [, options] of mocks.fetch.mock.calls) {
      expect(options.method).toBe("GET");
      expect(options.cache).toBe("no-store");
      expect(options.headers.Authorization).toBe("Bearer private-token");
    }
  });
  it("no consulta Fleet cuando falla user-service", async () => {
    mocks.session.mockResolvedValue(cashier);
    mocks.fetch.mockRejectedValueOnce(new Error("offline"));
    expect((await refundGet("cashier")).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("rechaza la sucursal ajena tanto en el contexto como en la factura", async () => {
    mocks.session.mockResolvedValue(cashier);
    mocks.fetch.mockResolvedValueOnce(Response.json([2]));
    mocks.fetch.mockResolvedValueOnce(Response.json({ id: 3, name: "Otra" }));
    expect((await refundGet("cashier")).status).toBe(502);
    mocks.fetch.mockResolvedValueOnce(Response.json([2]));
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...invoice, branchId: 3 }));
    expect((await refundPost(request("cashier"), "cashier", "10")).status).toBe(403);
    expect(mocks.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });
  it.each(["ADMIN", "DRIVER", "SUCURSAL_ADMIN", "CAJERO"])(
    "impide el cobro web al rol %s",
    async (role) => {
      mocks.session.mockResolvedValue({ ...customer, role: { name: role } });
      expect((await refundGet("customer")).status).toBe(403);
      expect((await refundPost(request(), "customer", "10")).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("impide el cobro presencial al cliente", async () => {
    expect((await refundPost(request("cashier"), "cashier", "10")).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([null, { ...customer, isActive: false }])("exige una sesión activa", async (user) => {
    mocks.session.mockResolvedValue(user);
    expect((await refundGet("customer")).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("bloquea la contraseña inicial pendiente", async () => {
    mocks.session.mockResolvedValue({ ...cashier, resetPassword: true });
    expect((await refundGet("cashier")).status).toBe(403);
  });
  it.each([{ amount: 1 }, { userId: 8 }, { branchId: 3 }, { walletId: 99 }])(
    "rechaza datos de pago manipulados: %j",
    async (extra) => {
      expect(
        (await refundPost(request("customer", { invoiceId: 10, ...extra }), "customer", "10"))
          .status,
      ).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("rechaza el origen externo y la factura diferente en el cuerpo", async () => {
    expect(
      (await refundPost(request("customer", undefined, "https://other.example"), "customer", "10"))
        .status,
    ).toBe(403);
    expect(
      (await refundPost(request("customer", { invoiceId: 11 }), "customer", "10")).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "abc", "1e1", "9007199254740992"])("valida el número de factura %s", async (id) => {
    expect((await refundGet("customer", id)).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["PAID", "REIMBURSED"])("no permite cobrar una factura %s", async (state) => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...invoice, state }));
    expect((await refundPost(request(), "customer", "10")).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("no muestra una factura ajena o tickets de otra factura", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...invoice, userId: 8 }));
    expect((await refundGet("customer", "10")).status).toBe(403);
    mocks.fetch
      .mockResolvedValueOnce(Response.json(invoice))
      .mockResolvedValueOnce(Response.json([{ ...ticket, invoiceId: 99 }]));
    expect((await refundGet("customer", "10")).status).toBe(502);
  });
  it("conserva el error de saldo insuficiente y no reintenta", async () => {
    mocks.session.mockResolvedValue(cashier);
    mocks.fetch
      .mockResolvedValueOnce(Response.json([2]))
      .mockResolvedValueOnce(Response.json(invoice))
      .mockResolvedValueOnce(Response.json({ detail: "Saldo insuficiente" }, { status: 409 }));
    const response = await refundPost(request("cashier"), "cashier", "10");
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toBe("Saldo insuficiente");
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it("un fallo de red no reenvía la devolución", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(invoice))
      .mockRejectedValueOnce(new Error("timeout"));
    const response = await refundPost(request(), "customer", "10");
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toContain("Actualiza la factura");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("rechaza una confirmación con otro monto", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(invoice))
      .mockResolvedValueOnce(Response.json({ ...transaction, amount: 1 }));
    expect((await refundPost(request(), "customer", "10")).status).toBe(502);
  });
  it.each([
    "/customer/refunds",
    "/customer/refunds/10",
    "/cashier/refunds",
    "/api/customer/refunds",
    "/api/customer/refunds/10",
    "/api/cashier/context",
    "/api/cashier/refunds/10",
  ])("habilita la ruta %s con no-store", (route) => {
    const response = middleware(new NextRequest("http://localhost:3000" + route));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as wallet } from "@/app/api/customer/wallet/route";
import { POST as recharge } from "@/app/api/customer/wallet/recharges/route";
import { GET as purchases } from "@/app/api/customer/purchases/route";
import { GET as detail } from "@/app/api/customer/purchases/[id]/route";
import { CustomerRechargeSchema } from "@/lib/validators/customer-commerce";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const user = {
  id: 7,
  customerId: 999,
  isActive: true,
  resetPassword: false,
  role: { id: 2, name: "CUSTOMER" },
};
const invoice = {
  id: 10,
  branchId: 2,
  userId: 7,
  totalAmount: 50,
  paymentDate: "2026-10-25T12:00:00",
  chanel: "WEB",
  sellerUserId: null,
  typeInvoice: "TICKET_PAYMENT",
  customerNit: "CF",
  state: "PAID",
};
const ticket = {
  id: 11,
  invoiceId: 10,
  amount: 50,
  position: { row: 1, column: 2 },
  paymentDate: invoice.paymentDate,
};
const transaction = {
  id: 81,
  transactionType: "USER_RECHARGE",
  createdAt: invoice.paymentDate,
  amount: 25.5,
  description: "Recarga",
};
const input = { amount: 25.5 };
function rechargeRequest(body: unknown = input, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/customer/wallet/recharges", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const detailRequest = () => new NextRequest("http://localhost:3000/api/customer/purchases/10");
const context = (id = "10") => ({ params: Promise.resolve({ id }) });
describe("Commerce del cliente autenticado", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockReturnValue({ value: "private-token" });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/wallets/me")) return Response.json({ id: 41, amount: 100 });
      if (url.endsWith("/wallets/me/transactions")) return Response.json([transaction]);
      if (url.endsWith("/wallets/me/recharges")) return Response.json(transaction, { status: 201 });
      if (url.endsWith("/payments/me")) return Response.json([invoice]);
      if (url.endsWith("/payments/10")) return Response.json(invoice);
      if (url.endsWith("/payments/10/tickets")) return Response.json([ticket]);
      throw new Error("Ruta inesperada");
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("consulta saldo e historial propios mediante /me y envía el Bearer", async () => {
    const response = await wallet();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      wallet: { id: 41, amount: 100 },
      transactions: [transaction],
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of mocks.fetch.mock.calls) {
      expect(url).toContain("/wallets/me");
      expect(url).not.toContain("999");
      expect(options.headers.Authorization).toBe("Bearer private-token");
      expect(options.cache).toBe("no-store");
    }
  });
  it("recarga una sola vez, con la fecha del servidor y sin identificadores del navegador", async () => {
    const response = await recharge(rechargeRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ transaction });
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/wallets\/me\/recharges$/);
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(Object.keys(body).sort()).toEqual(["amount", "rechargeDate"]);
    expect(body.amount).toBe(25.5);
    expect(body.rechargeDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("consulta las facturas propias y sus tickets", async () => {
    expect(await (await purchases()).json()).toEqual([invoice]);
    expect(await (await detail(detailRequest(), context())).json()).toEqual({
      invoice,
      tickets: [ticket],
    });
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "DRIVER", "CAJERO"])("rechaza el rol %s", async (role) => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 1, name: role } });
    expect((await wallet()).status).toBe(403);
    expect((await recharge(rechargeRequest())).status).toBe(403);
    expect((await purchases()).status).toBe(403);
    expect((await detail(detailRequest(), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([null, { ...user, isActive: false }])("exige sesión activa: %j", async (actor) => {
    mocks.session.mockResolvedValue(actor);
    expect((await wallet()).status).toBe(401);
    expect((await recharge(rechargeRequest())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza una cuenta con contraseña inicial pendiente", async () => {
    mocks.session.mockResolvedValue({ ...user, resetPassword: true });
    expect((await wallet()).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, Infinity, 1.001, 0.000000001, "25", null])(
    "valida el monto %s antes de escribir",
    async (amount) => {
      expect(CustomerRechargeSchema.safeParse({ amount }).success).toBe(false);
      expect((await recharge(rechargeRequest({ amount }))).status).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("rechaza origen externo y campos que intentan cambiar la billetera o la fecha", async () => {
    expect((await recharge(rechargeRequest(input, "https://otro.example"))).status).toBe(403);
    for (const extra of [
      { walletId: 99 },
      { ownerId: 99 },
      { userId: 99 },
      { rechargeDate: invoice.paymentDate },
    ])
      expect((await recharge(rechargeRequest({ ...input, ...extra }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("no muestra facturas de otro cliente aunque Commerce las devuelva", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json([{ ...invoice, userId: 99 }]));
    expect((await purchases()).status).toBe(403);
  });
  it("impide consultar tickets de una factura ajena incluso si figura como vendedor", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...invoice, userId: 99, sellerUserId: 7 }));
    expect((await detail(detailRequest(), context())).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("rechaza un ticket de otra factura", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(invoice))
      .mockResolvedValueOnce(Response.json([{ ...ticket, invoiceId: 99 }]));
    expect((await detail(detailRequest(), context())).status).toBe(502);
  });
  it.each(["0", "abc", "9007199254740992"])("rechaza el identificador %s", async (id) => {
    expect((await detail(detailRequest(), context(id))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("permite una factura de alquiler sin tickets", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({ ...invoice, typeInvoice: "RENTAL_PAYMENT" }))
      .mockResolvedValueOnce(Response.json([]));
    expect((await detail(detailRequest(), context())).status).toBe(200);
  });
  it.each([{ amount: 10 }, { transactionType: "TICKET_PAYMENT" }])(
    "no confirma una recarga distinta: %j",
    async (change) => {
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...transaction, ...change }));
      expect((await recharge(rechargeRequest())).status).toBe(502);
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("no reintenta una recarga tras un fallo de red", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    const response = await recharge(rechargeRequest());
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toContain("Revisa tu saldo");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("un 401 de Commerce no invalida la sesión ya validada por Identity", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    expect((await purchases()).status).toBe(502);
  });
});

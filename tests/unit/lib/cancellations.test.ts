// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/customer/purchases/[id]/cancellation/route";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const user = { id: 7, isActive: true, resetPassword: false, role: { id: 2, name: "CUSTOMER" } };
const invoice = {
  id: 10,
  branchId: 2,
  userId: 7,
  totalAmount: 50,
  paymentDate: "2026-10-27T12:00:00",
  typeInvoice: "TICKET_PAYMENT",
  state: "PAID",
};
const ticket = {
  id: 11,
  invoiceId: 10,
  amount: 25,
  paymentDate: invoice.paymentDate,
  position: { row: 1, column: 2 },
  state: "PAID",
};
const context = (id = "10") => ({ params: Promise.resolve({ id }) });
function request(
  body: unknown = { scope: "tickets", tickets: [11] },
  origin = "http://localhost:3000",
) {
  return new NextRequest("http://localhost:3000/api/customer/purchases/10/cancellation", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function setupRead(changes = {}, tickets: unknown[] = [ticket, { ...ticket, id: 12 }]) {
  mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
    if (options.method === "POST") return new Response(null, { status: 204 });
    return Response.json(url.endsWith("/tickets") ? tickets : { ...invoice, ...changes });
  });
}
describe("Cancelación propia de tickets", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.get.mockReturnValue({ value: "customer-token" });
    setupRead();
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    { input: { scope: "tickets", tickets: [11] }, path: "tickets", body: { tickets: [11] } },
    {
      input: { scope: "tickets", tickets: [11, 12] },
      path: "tickets",
      body: { tickets: [11, 12] },
    },
    { input: { scope: "invoice" }, path: "invoices", body: { invoiceId: 10 } },
  ])(
    "envía $path y acepta el 204 sin intentar leer JSON: $input",
    async ({ input, path, body }) => {
      const response = await POST(request(input), context());
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
      const [url, options] = mocks.fetch.mock.calls[2]!;
      expect(url).toMatch(new RegExp("/cancellations/" + path + "$"));
      expect(JSON.parse(options.body)).toEqual(body);
      expect(options.headers.Authorization).toBe("Bearer customer-token");
      expect(options.cache).toBe("no-store");
    },
  );
  it("cancela los restantes de una factura parcialmente cancelada", async () => {
    setupRead({ totalAmount: 25 }, [
      { ...ticket, state: "CANCELLED" },
      { ...ticket, id: 12 },
    ]);
    expect((await POST(request({ scope: "invoice" }), context())).status).toBe(204);
  });
  it.each([null, { ...user, isActive: false }])(
    "exige sesión antes de consultar Commerce: %j",
    async (session) => {
      mocks.session.mockResolvedValue(session);
      expect((await POST(request(), context())).status).toBe(401);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each(["ADMIN", "CAJERO", "DRIVER", "SUCURSAL_ADMIN"])(
    "no habilita cancelación propia para %s",
    async (role) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 5, name: role } });
      expect((await POST(request(), context())).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("rechaza origen externo", async () => {
    expect((await POST(request(undefined, "https://otro.example"), context())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { scope: "tickets", tickets: [] },
    { scope: "tickets", tickets: [0] },
    { scope: "tickets", tickets: [11, 11] },
    { scope: "tickets", tickets: ["11"] },
    { scope: "invoice", tickets: [11] },
    { scope: "invoice", userId: 99 },
    { scope: "invoice", amount: 500 },
    { scope: "tickets", tickets: [11], walletId: 44 },
  ])("rechaza datos extra o selección inválida: %j", async (input) => {
    expect((await POST(request(input), context())).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "abc", "9007199254740992"])("rechaza factura inválida %s", async (id) => {
    expect((await POST(request(), context(id))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("no permite cancelar una factura ajena aunque el usuario figure como vendedor", async () => {
    setupRead({ userId: 99, sellerUserId: 7 });
    expect((await POST(request(), context())).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([{ state: "CANCELLED" }, { state: "REIMBURSED" }, { typeInvoice: "RENTAL_PAYMENT" }])(
    "no cancela una factura no vigente: %j",
    async (changes) => {
      setupRead(changes);
      expect((await POST(request(), context())).status).toBe(409);
      expect(mocks.fetch.mock.calls.some(([, options]) => options.method === "POST")).toBe(false);
    },
  );
  it.each(["CANCELLED", "REIMBURSED", undefined])(
    "no cancela un ticket con estado %s",
    async (state) => {
      setupRead({}, [{ ...ticket, state }]);
      expect((await POST(request(), context())).status).toBe(409);
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
    },
  );
  it("no envía un ticket que no figura en la factura", async () => {
    expect((await POST(request({ scope: "tickets", tickets: [99] }), context())).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("no cancela toda la factura cuando no se conoce el estado de algún ticket", async () => {
    setupRead({}, [ticket, { ...ticket, id: 12, state: undefined }]);
    expect((await POST(request({ scope: "invoice" }), context())).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("rechaza una respuesta con tickets de otra factura", async () => {
    setupRead({}, [{ ...ticket, invoiceId: 99 }]);
    expect((await POST(request(), context())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("conserva el motivo de rechazo de Commerce", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(invoice))
      .mockResolvedValueOnce(Response.json([ticket]))
      .mockResolvedValueOnce(
        Response.json({ detail: "Este ticket no puede cancelarse" }, { status: 400 }),
      );
    const response = await POST(request(), context());
    expect(response.status).toBe(400);
    expect((await response.json()).detail).toBe("Este ticket no puede cancelarse");
  });
  it.each(["timeout", "503", "unexpected-success"])(
    "no reintenta una escritura incierta: %s",
    async (failure) => {
      mocks.fetch
        .mockResolvedValueOnce(Response.json(invoice))
        .mockResolvedValueOnce(Response.json([ticket]));
      if (failure === "timeout") mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
      else
        mocks.fetch.mockResolvedValueOnce(
          Response.json({}, { status: failure === "503" ? 503 : 200 }),
        );
      const response = await POST(request(), context());
      expect(response.status).toBe(failure === "503" ? 503 : 502);
      expect((await response.json()).detail).toContain("cancelación");
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
    },
  );
  it("habilita la ruta del BFF sin caché en middleware", () => {
    const response = middleware(request());
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

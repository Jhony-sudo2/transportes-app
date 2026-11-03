// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { commerceOperation } from "@/lib/api/commerce-operations";
import { rentalOperation } from "@/lib/api/rental-operations";
import { maintenanceOperation } from "@/lib/api/maintenance-operations";
import { analyticsOperation } from "@/lib/api/analytics-operations";
import {
  SeatMapSchema,
  RefundSchema,
  PurchaseResponseSchema,
  CancellationPolicySchema,
} from "@/lib/validators/commerce";
import { RentalContractSchema } from "@/lib/validators/rentals";
import { decimalDisplay } from "@/lib/analytics-ui";
import { ReportRowSchema } from "@/lib/validators/analytics";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
const user = {
  id: 7,
  customerId: 999,
  nit: "1234567",
  isActive: true,
  resetPassword: false,
  branchIds: [2],
  role: { id: 2, name: "CUSTOMER" },
};
const branch = { id: 2, name: "Central", active: true, latitude: 14.6, longitude: -90.5 };
const invoice = {
  invoiceId: 10,
  customerId: 999,
  customerNit: "1234567",
  customerName: "Cliente Real",
  totalAmount: 100,
  paymentDate: "2026-11-01",
  channel: "WEB",
  sourceBranchId: null,
  revenueBranchId: 2,
  sellerUserId: null,
  state: "PAID",
  typeInvoice: "TICKET_PAYMENT",
  contactEmailStatus: "VERIFIED",
};
it("interpreta facturas y reembolsos con los campos que Commerce publica", () => {
  const purchase = PurchaseResponseSchema.parse({
    invoiceId: 10,
    customerId: 999,
    customerNit: "1234567",
    customerName: "Cliente",
    totalAmount: 75,
    paymentDate: "2026-11-04",
    channel: "WEB",
    sourceBranchId: null,
    revenueBranchId: 2,
    tickets: [{ ticketId: 11, tripId: 20, seatRow: 1, seatColumn: 1, amount: 75, state: "PAID" }],
  });
  expect(purchase.invoice.sellerUserId).toBeNull();
  expect(purchase.tickets[0]).toMatchObject({ invoiceId: 10, cancelled: false });
  expect(purchase.tickets[0]?.cancellationPreview).toBeUndefined();
  expect(
    RefundSchema.parse({
      refundId: 30,
      refundCode: "R30",
      ticketId: 11,
      cause: "VOLUNTARY",
      appliedPercent: 75,
      amount: 56.25,
      status: "PENDING",
    }),
  ).toMatchObject({ rentalId: null, method: null, settledAt: null });
});
const ticket = {
  ticketId: 11,
  tripId: 20,
  seatRow: 1,
  seatColumn: 1,
  invoiceId: 10,
  amount: 100,
  cancelled: false,
};
const map = {
  tripId: 20,
  seatRows: 1,
  seatColumns: 3,
  seatLayoutRevision: 1,
  seats: [
    { row: 1, column: 1, state: "AVAILABLE" },
    { row: 1, column: 2, state: "BLOCKED", reason: "Asiento dañado" },
  ],
};
const wireMap = {
  ...map,
  seats: map.seats.map(({ state, ...seat }) => ({ ...seat, status: state })),
};
const refund = {
  refundId: 30,
  invoiceId: 10,
  ticketId: 11,
  rentalId: null,
  refundCode: "EXACT-30",
  cause: "VOLUNTARY",
  appliedPercent: 75,
  amount: 75,
  status: "PENDING",
  method: null,
  settledAt: null,
};
const quote = {
  quoteId: 40,
  customerId: 999,
  origin: "Guatemala",
  destination: "Cobán",
  departureAt: "2027-01-02T09:00:00-06:00",
  returnDepartureAt: "2027-01-03T09:00:00-06:00",
  passengerCount: 20,
  busTypeId: 1,
  waitHours: 0,
  status: "APPROVED",
  expiresAt: "2027-01-01T09:00:00-06:00",
  finalPrice: 1000,
  managingBranchId: 2,
  rentalId: null,
  invoiceId: null,
  estimatedCost: 600,
  priceComponents: [{ description: "Gasto interno", amount: 20 }],
};
const wireQuote = {
  quoteId: quote.quoteId,
  quoteReference: "TEST-40",
  customerId: quote.customerId,
  status: quote.status,
  expiresAt: quote.expiresAt,
  finalPrice: quote.finalPrice,
  managingBranchId: quote.managingBranchId,
  rentalId: quote.rentalId,
  estimatedCost: quote.estimatedCost,
  priceComponents: { additionalCosts: quote.priceComponents },
  routeSummary: {
    origin: quote.origin,
    destination: quote.destination,
    departureAt: quote.departureAt,
    returnDepartureAt: null,
    passengerCount: quote.passengerCount,
    busTypeId: quote.busTypeId,
    waitHours: quote.waitHours,
  },
};
const leg = {
  tripId: 50,
  tripType: "PRIVATE",
  status: "SCHEDULED",
  route: null,
  operatingBranchId: null,
  rentalId: 60,
  busId: null,
  driverId: null,
  scheduledDepartureAt: quote.departureAt,
  scheduledArrivalAt: "2027-01-02T12:00:00-06:00",
  price: null,
  departure: null,
  arrival: null,
  legType: "OUTBOUND",
};
const rental = {
  rentalId: 60,
  quoteId: 40,
  invoiceId: 10,
  customerId: 999,
  managingBranchId: 2,
  status: "PAID",
  legs: [leg],
  cancelledAt: null,
};
const bus = {
  id: 5,
  brand: "Volvo",
  model: "Touring",
  plateNumber: "C123ABC",
  state: "AVAILABLE",
  busTypeId: 1,
  rentalEnabled: true,
};
const key = "bd8fb388-b349-4d42-8bc7-25b4f6b65f6e";
let overrides: Record<string, unknown | Response>;
function asRole(name: string) {
  mocks.session.mockResolvedValue({ ...user, role: { id: 3, name } });
}
function request(
  path: string,
  data?: unknown,
  query = "",
  method = data === undefined ? "GET" : "POST",
  operationKey: string | null = key,
) {
  return new NextRequest(`http://localhost:3000/api/commerce/${path}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      Origin: "http://localhost:3000",
      ...(operationKey ? { "Idempotency-Key": operationKey } : {}),
      "Content-Type": "application/json",
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
const writes = () => mocks.fetch.mock.calls.filter(([, o]) => o.method !== "GET");
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.session.mockResolvedValue(user);
  mocks.cookie.mockImplementation((name: string) => ({
    value: name === "access_token" ? "token" : "2",
  }));
  overrides = {};
  mocks.fetch.mockImplementation(
    async (url: string, options: { method: string; body?: string }) => {
      const path = new URL(url).pathname.replace(/^\/api\/v1\//, ""),
        override = overrides[`${options.method} ${path}`];
      if (override !== undefined)
        return override instanceof Response ? override : Response.json(override);
      const defaults: Record<string, unknown> = {
        "users/7/branches": [2],
        "branches/2": branch,
        "branches/catalog": [{ branchId: 2, name: "Central" }],
        trips: [
          {
            tripId: 20,
            routeId: 10,
            originBranchId: 2,
            destinationBranchId: 3,
            busId: 5,
            departureAt: "2027-01-02T10:00:00Z",
            price: 50,
            seatsAvailable: null,
          },
        ],
        branches: [branch],
        "wallets/me": { balance: 100, active: true },
        "wallets/me/transactions": [],
        "payments/me": [{ ...invoice, tickets: [{ ...ticket, state: "PAID" }] }],
        "payments/10/tickets": { ...invoice, tickets: [{ ...ticket, state: "PAID" }] },
        "seats/trips/20": wireMap,
        "customers/by-nit/1234567": {
          customerId: 999,
          nit: "1234567",
          fullName: "Cliente Real",
          hasUser: true,
          email: "verified@example.com",
        },
        "refunds/me": [refund],
        "refunds/claim": {
          ...refund,
          holderName: "Titular",
          tripId: 20,
          seatRow: 1,
          seatColumn: 1,
          operationBranchId: 2,
          cashSettleable: true,
          requiredChecks: ["REFUND_CODE_PRESENTED", "HOLDER_IDENTITY_VERIFIED"],
        },
        "refunds/30": refund,
        "rental-quotes/me": { content: [wireQuote], page: 0, size: 100, totalElements: 1 },
        "rental-quotes/admin": { content: [wireQuote], page: 0, size: 100, totalElements: 1 },
        "rental-quotes/payable": [quote],
        "rental-quotes/40": wireQuote,
        "rentals/me": { content: [rental], page: 0, size: 100, totalElements: 1 },
        "rentals/60": rental,
        "branches/2/buses": [bus],
        "branches/2/drivers": [
          {
            id: 8,
            name: "Juan",
            lastName: "Chofer",
            email: "driver@example.com",
            status: "ACTIVE",
            userId: 80,
          },
        ],
        "expense-categories": [{ categoryId: 1, name: "Repuestos", active: true }],
        "cancellation-policy": { cutoffMinutes: 15, voluntaryRefundPercent: 75 },
      };
      if (options.method === "GET" && path in defaults) return Response.json(defaults[path]);
      return Response.json({ detail: `No previsto: ${options.method} ${path}` }, { status: 500 });
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("Etapa 4: compra, caja e identidad comercial", () => {
  it("consulta la wallet del Customer sin enviar un ownerId elegido por el navegador", async () => {
    const r = await commerceOperation(request("wallet"), ["wallet"]);
    expect(await r.json()).toEqual({ wallet: { balance: 100, active: true }, transactions: [] });
    expect(mocks.fetch.mock.calls.map((c) => c[0])).toEqual([
      expect.stringMatching(/wallets\/me$/),
      expect.stringMatching(/wallets\/me\/transactions$/),
    ]);
  });
  it("muestra movimientos recibidos con transactionId del proveedor", async () => {
    overrides["GET wallets/me/transactions"] = [
      {
        transactionId: 91,
        transactionType: "USER_RECHARGE",
        createdAt: "2026-11-04T12:00:00Z",
        amount: 25,
        balanceAfter: 125,
        description: null,
        paymentDate: "2026-11-04",
      },
    ];
    const response = await commerceOperation(request("wallet"), ["wallet"]);
    expect(response.status).toBe(200);
    expect((await response.json()).transactions).toEqual([
      {
        id: 91,
        transactionType: "USER_RECHARGE",
        createdAt: "2026-11-04T12:00:00Z",
        amount: 25,
        balanceAfter: 125,
        description: null,
      },
    ]);
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "DRIVER", "CAJERO"])(
    "rechaza acceso de %s a billetera personal",
    async (role) => {
      asRole(role);
      expect((await commerceOperation(request("wallet"), ["wallet"])).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("reenvía sin alterar la llave y el contenido de la recarga", async () => {
    overrides["POST wallets/me/recharges"] = { transactionId: 1, balanceAfter: 125 };
    const r = await commerceOperation(
      request("wallet/recharges", { amount: 25, paymentDate: "2026-11-04" }),
      ["wallet", "recharges"],
    );
    expect(r.status).toBe(201);
    expect(writes()[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "Idempotency-Key": key }),
      body: JSON.stringify({ amount: 25, paymentDate: "2026-11-04" }),
    });
  });
  it("rechaza una recarga sin llave de operación", async () => {
    expect(
      (
        await commerceOperation(
          request("wallet/recharges", { amount: 25, paymentDate: "2026-11-04" }, "", "POST", null),
          ["wallet", "recharges"],
        )
      ).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it.each([
    { amount: 0, paymentDate: "2026-11-04" },
    { amount: -1, paymentDate: "2026-11-04" },
    { amount: 1.001, paymentDate: "2026-11-04" },
    { amount: 20, paymentDate: "2026-11-04", ownerId: 99 },
    { amount: 20 },
    { amount: 20, paymentDate: "2026-02-30" },
  ])("rechaza monto o autoridad adicional %j", async (body) => {
    expect(
      (await commerceOperation(request("wallet/recharges", body), ["wallet", "recharges"])).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it("la retención no admite una posición inexistente en la capacidad física", async () => {
    const r = await commerceOperation(
      request("seats/20/holds", { seats: [{ row: 1, column: 3 }] }),
      ["seats", "20", "holds"],
    );
    expect(r.status).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it("interpreta el mapa de Commerce y permite un bloqueo sin motivo público", async () => {
    overrides["GET seats/trips/20"] = {
      tripId: 20,
      seatRows: 1,
      seatColumns: 2,
      seatLayoutRevision: 7,
      seats: [
        { row: 1, column: 1, status: "AVAILABLE" },
        { row: 1, column: 2, status: "BLOCKED" },
      ],
    };
    const response = await commerceOperation(request("seats/20"), ["seats", "20"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tripId: 20,
      seatRows: 1,
      seatColumns: 2,
      seatLayoutRevision: 7,
      seats: [
        { row: 1, column: 1, state: "AVAILABLE" },
        { row: 1, column: 2, state: "BLOCKED" },
      ],
    });
  });
  it("no retiene asiento bloqueado aunque el navegador lo seleccione", async () => {
    expect(
      (
        await commerceOperation(request("seats/20/holds", { seats: [{ row: 1, column: 2 }] }), [
          "seats",
          "20",
          "holds",
        ])
      ).status,
    ).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it("no calcula el importe de la retención con el precio del navegador", async () => {
    overrides["POST seats/trips/20/holds"] = {
      holdId: "hold-1",
      expiresAt: "2027-01-01T00:00:00-06:00",
      totalAmount: 100,
    };
    const r = await commerceOperation(
      request("seats/20/holds", { seats: [{ row: 1, column: 1 }] }),
      ["seats", "20", "holds"],
    );
    expect(r.status).toBe(201);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual({ seats: [{ row: 1, column: 1 }] });
  });
  it("paga boletos con hold y fecha civil sin aceptar importe ni Customer del cliente", async () => {
    overrides["POST payments/tickets"] = { invoiceId: 10, totalAmount: 100, tickets: [ticket] };
    const r = await commerceOperation(
      request("payments/tickets", { holdId: "hold-1", paymentDate: "2026-11-01" }),
      ["payments", "tickets"],
    );
    expect(r.status).toBe(201);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual({
      holdId: "hold-1",
      paymentDate: "2026-11-01",
    });
  });
  it("confirma el pago web que Commerce devuelve sin sucursal física ni vendedor", async () => {
    overrides["POST payments/tickets"] = {
      ...invoice,
      tickets: [{ ...ticket, state: "PAID" }],
      sourceBranchId: null,
      sellerUserId: null,
      contactEmailStatus: null,
    };
    const body = { holdId: "hold-1", paymentDate: "2026-11-01" };
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await commerceOperation(request("payments/tickets", body), [
        "payments",
        "tickets",
      ]);
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        invoiceId: 10,
        sourceBranchId: null,
        sellerUserId: null,
      });
    }
    expect(writes().map(([, options]) => options.headers["Idempotency-Key"])).toEqual([key, key]);
    expect(writes().map(([, options]) => JSON.parse(options.body))).toEqual([body, body]);
  });
  it.each([{ totalAmount: 1 }, { customerId: 7 }, { sourceBranchId: 3 }, { sellerUserId: 9 }])(
    "rechaza suplantación en pago web %j",
    async (extra) => {
      expect(
        (
          await commerceOperation(
            request("payments/tickets", { holdId: "h", paymentDate: "2026-11-01", ...extra }),
            ["payments", "tickets"],
          )
        ).status,
      ).toBe(400);
      expect(writes()).toHaveLength(0);
    },
  );
  it("el cajero conserva su única sucursal obtenida de Identity", async () => {
    asRole("CAJERO");
    expect(await (await commerceOperation(request("context"), ["context"])).json()).toEqual({
      userId: 7,
      branchId: 2,
      branchName: "Central",
      canManageCapital: false,
    });
  });
  it("consulta viajes públicos de su sucursal sin pedir rutas administrativas", async () => {
    asRole("CAJERO");
    const response = await commerceOperation(request("restrictions/context"), [
      "restrictions",
      "context",
    ]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      trips: [{ tripId: 20, departureAt: "2027-01-02T10:00:00Z" }],
      buses: [],
    });
    expect(
      mocks.fetch.mock.calls.some(([url]) => String(url).includes("/trips?originBranchId=2")),
    ).toBe(true);
  });
  it("no acepta que el cajero opere otra sucursal desde query", async () => {
    asRole("CAJERO");
    expect(
      (await commerceOperation(request("context", undefined, "branchId=3"), ["context"])).status,
    ).toBe(403);
  });
  it("rechaza contexto ambiguo si el cajero tiene dos sucursales", async () => {
    asRole("CAJERO");
    mocks.session.mockResolvedValue({
      ...user,
      role: { id: 5, name: "CAJERO" },
      branchIds: [2, 3],
    });
    expect((await commerceOperation(request("context"), ["context"])).status).toBe(403);
  });
  it("no da permiso de capital al cajero", async () => {
    asRole("CAJERO");
    expect(
      (await commerceOperation(request("cash/open", { amount: 0 }), ["cash", "open"])).status,
    ).toBe(403);
    expect(
      (
        await commerceOperation(
          request("cash/capital-movements", { type: "IN", amount: 10, reason: "Aporte" }),
          ["cash", "capital-movements"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("permite apertura con cero sin inventar un movimiento monetario", async () => {
    asRole("SUCURSAL_ADMIN");
    overrides["POST cash/branches/2/open"] = {
      branchId: 2,
      balance: 0,
      initialized: true,
      initializedAt: "2026-11-01T09:00:00-06:00",
    };
    expect(
      (await commerceOperation(request("cash/open", { amount: 0 }, "branchId=2"), ["cash", "open"]))
        .status,
    ).toBe(200);
    expect(writes()).toHaveLength(1);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual({ initialAmount: 0 });
  });
  it("muestra la caja sin abrir cuando Commerce omite initializedAt", async () => {
    asRole("CAJERO");
    overrides["GET cash/branches/2"] = { branchId: 2, balance: 0, initialized: false };
    const response = await commerceOperation(request("cash"), ["cash"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ branchId: 2, balance: 0, initializedAt: null });
    expect(writes()).toHaveLength(0);
  });
  it("rechaza una caja que declara estar abierta sin fecha de apertura", async () => {
    asRole("CAJERO");
    overrides["GET cash/branches/2"] = { branchId: 2, balance: 0, initialized: true };
    expect((await commerceOperation(request("cash"), ["cash"])).status).toBe(502);
  });
  it.each(["IN", "OUT"])(
    "confirma el recibo de capital %s y consulta el saldo vigente",
    async (type) => {
      asRole("SUCURSAL_ADMIN");
      overrides["POST cash/branches/2/capital-movements"] = {
        movementId: 1,
        kind: type === "IN" ? "CAPITAL_IN" : "CAPITAL_OUT",
        amount: 10,
        balanceAfter: 40,
      };
      overrides["GET cash/branches/2"] = {
        branchId: 2,
        balance: 40,
        initialized: true,
        initializedAt: "2026-11-01T09:00:00-06:00",
      };
      const response = await commerceOperation(
        request("cash/capital-movements", { type, amount: 10, reason: "Capital" }, "branchId=2"),
        ["cash", "capital-movements"],
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ branchId: 2, balance: 40 });
      expect(writes()).toHaveLength(1);
      expect(JSON.parse(writes()[0]?.[1].body)).toEqual({ type, amount: 10, reason: "Capital" });
    },
  );
  it("no permite editar contacto de un NIT con User", async () => {
    asRole("CAJERO");
    expect(
      (
        await commerceOperation(
          request("customers/999/contact", { fullName: "Otro nombre" }, "nit=1234567", "PATCH"),
          ["customers", "999", "contact"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("no permite crear una Person para el Customer CF", async () => {
    asRole("CAJERO");
    expect(
      (
        await commerceOperation(
          request("customers/counter", { nit: "CF", fullName: "Inventado" }),
          ["customers", "counter"],
        )
      ).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it("no permite cambiar el correo de cuenta al cobrar", async () => {
    asRole("CAJERO");
    expect(
      (
        await commerceOperation(
          request("payments/counter", {
            holdId: "h",
            paymentDate: "2026-11-01",
            nit: "1234567",
            contactEmail: "other@example.com",
          }),
          ["payments", "counter"],
        )
      ).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it("no confirma factura POS atribuida a otra caja", async () => {
    asRole("CAJERO");
    overrides["POST payments/counter"] = {
      invoiceId: 10,
      totalAmount: 100,
      tickets: [ticket],
      customerId: 999,
      sellerUserId: 7,
      sourceBranchId: 3,
      revenueBranchId: 3,
      paymentDate: "2026-11-01",
      contactEmailStatus: "NOT_PROVIDED",
    };
    expect(
      (
        await commerceOperation(
          request("payments/counter", { holdId: "h", paymentDate: "2026-11-01", nit: "CF" }),
          ["payments", "counter"],
        )
      ).status,
    ).toBe(502);
  });
  it("el historial pertenece a Customer.id y no exige que coincida con User.id", async () => {
    expect((await commerceOperation(request("invoices/mine"), ["invoices", "mine"])).status).toBe(
      200,
    );
  });
  it("muestra compras web y presenciales aunque la vista del cliente omita al vendedor", async () => {
    const web = {
      ...invoice,
      contactEmailStatus: null,
      tickets: [{ ...ticket, state: "PAID", cancellationPreview: null }],
    };
    const counter = {
      ...invoice,
      invoiceId: 12,
      channel: "IN_PERSON",
      sourceBranchId: 2,
      sellerUserId: undefined,
      contactEmailStatus: null,
      tickets: [{ ...ticket, ticketId: 13, state: "PAID", cancellationPreview: null }],
    };
    overrides["GET payments/me"] = [web, counter];
    const response = await commerceOperation(request("invoices/mine"), ["invoices", "mine"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([
      { invoiceId: 10, channel: "WEB", contactEmailStatus: null },
      { invoiceId: 12, channel: "IN_PERSON", sourceBranchId: 2, sellerUserId: null },
    ]);
    overrides["GET payments/12/tickets"] = counter;
    const detail = await commerceOperation(request("invoices/12"), ["invoices", "12"]);
    expect(detail.status).toBe(200);
    const receipt = await detail.json();
    expect(receipt.invoice).toMatchObject({ invoiceId: 12, sellerUserId: null });
    expect(receipt.tickets[0]).toMatchObject({ ticketId: 13, invoiceId: 12, cancelled: false });
    expect(receipt.tickets[0].cancellationPreview).toBeUndefined();
    expect(writes()).toHaveLength(0);
  });
  it("no admite una factura presencial sin sucursal de venta", async () => {
    overrides["GET payments/me"] = [
      { ...invoice, channel: "IN_PERSON", sourceBranchId: null, tickets: [] },
    ];
    expect((await commerceOperation(request("invoices/mine"), ["invoices", "mine"])).status).toBe(
      502,
    );
  });
  it("rechaza compras CF en el historial personal aunque coincida un correo", async () => {
    overrides["GET payments/me"] = [{ ...invoice, customerNit: "CF", tickets: [] }];
    expect((await commerceOperation(request("invoices/mine"), ["invoices", "mine"])).status).toBe(
      403,
    );
  });
  it("impide consultar comprobante ajeno", async () => {
    overrides["GET payments/me"] = [];
    expect((await commerceOperation(request("invoices/10"), ["invoices", "10"])).status).toBe(403);
    expect(mocks.fetch.mock.calls.some((c) => String(c[0]).includes("payments/10/tickets"))).toBe(
      false,
    );
  });
  it("no sigue una ruta externa arbitraria del navegador", async () => {
    expect((await commerceOperation(request("http/evil"), ["http", "evil"])).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
describe("Etapa 5: obligaciones y liquidaciones independientes", () => {
  it("devuelve una obligación pendiente sin realizar ningún abono", async () => {
    const r = await commerceOperation(request("refunds/mine"), ["refunds", "mine"]);
    expect(await r.json()).toEqual([refund]);
    expect(writes()).toHaveLength(0);
  });
  it("solo abona wallet con confirmación persistida COMPLETED/WALLET", async () => {
    overrides["POST refunds/30/settle-wallet"] = {
      ...refund,
      status: "COMPLETED",
      method: "WALLET",
      settledAt: "2026-11-01T10:00:00-06:00",
    };
    expect(
      (
        await commerceOperation(request("refunds/30/settle-wallet", {}), [
          "refunds",
          "30",
          "settle-wallet",
        ])
      ).status,
    ).toBe(200);
  });
  it("no anuncia liquidación si el servicio conserva PENDING", async () => {
    overrides["POST refunds/30/settle-wallet"] = refund;
    expect(
      (
        await commerceOperation(request("refunds/30/settle-wallet", {}), [
          "refunds",
          "30",
          "settle-wallet",
        ])
      ).status,
    ).toBe(502);
  });
  it("no acepta un importe ni walletId para la liquidación", async () => {
    expect(
      (
        await commerceOperation(request("refunds/30/settle-wallet", { amount: 1, walletId: 7 }), [
          "refunds",
          "30",
          "settle-wallet",
        ])
      ).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it("el cobro de efectivo puede corresponder a una venta de otra sucursal", async () => {
    asRole("CAJERO");
    overrides["POST refunds/30/settle-cash"] = {
      ...refund,
      status: "COMPLETED",
      method: "CASH",
      settledAt: "2026-11-01T10:00:00-06:00",
      paidBranchId: 2,
      processedByUserId: 7,
    };
    const r = await commerceOperation(
      request("refunds/30/settle-cash", { code: "EXACT-30", delivered: true }),
      ["refunds", "30", "settle-cash"],
    );
    expect(r.status).toBe(200);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual({ branchId: 2, delivered: true });
    expect(
      mocks.fetch.mock.calls.some(([url]) => String(url).includes("refunds/30?code=EXACT-30")),
    ).toBe(true);
  });
  it("conserva los datos del comprobante y sus verificaciones presenciales", async () => {
    asRole("CAJERO");
    const response = await commerceOperation(request("refunds/claim", undefined, "code=EXACT-30"), [
      "refunds",
      "claim",
    ]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      holderName: "Titular",
      tripId: 20,
      seatRow: 1,
      seatColumn: 1,
      operationBranchId: 2,
      requiredChecks: ["REFUND_CODE_PRESENTED", "HOLDER_IDENTITY_VERIFIED"],
    });
  });
  it("rechaza código distinto al comprobante antes de entregar efectivo", async () => {
    asRole("CAJERO");
    expect(
      (
        await commerceOperation(
          request("refunds/30/settle-cash", { code: "OTHER", delivered: true }),
          ["refunds", "30", "settle-cash"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("administrador de sucursal consulta claim pero no entrega efectivo como cajero", async () => {
    asRole("SUCURSAL_ADMIN");
    expect(
      (
        await commerceOperation(
          request("refunds/30/settle-cash", { code: "EXACT-30", delivered: true }, "branchId=2"),
          ["refunds", "30", "settle-cash"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it.each([
    { ticketId: null, rentalId: null },
    { ticketId: 1, rentalId: 2 },
    { method: "CASH" },
    { status: "COMPLETED", method: "CASH", settledAt: "2026-11-01T10:00:00-06:00" },
  ])("rechaza estado o referencia XOR contradictorios %j", (extra) => {
    expect(RefundSchema.safeParse({ ...refund, ...extra }).success).toBe(false);
  });
  it.each([0, -1, 100.01])("la política rechaza porcentaje %s", (percent) => {
    expect(
      CancellationPolicySchema.safeParse({ cutoffMinutes: 0, voluntaryRefundPercent: percent })
        .success,
    ).toBe(false);
  });
  it("CASHIER no puede modificar la política global", async () => {
    asRole("CAJERO");
    expect(
      (
        await commerceOperation(
          request("policy", { cutoffMinutes: 15, voluntaryRefundPercent: 75 }, "", "PUT"),
          ["policy"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
});
describe("Etapa 6: cotización, pago y contratación", () => {
  it("lee la política global y admite los metadatos de auditoría de Journey", async () => {
    asRole("ADMIN");
    overrides["GET rental-quote-policy"] = {
      validityDays: 7,
      waitCostPerHour: 25,
      updatedByUserId: 1,
      updatedAt: "2026-11-04T17:00:00Z",
    };
    const response = await rentalOperation(request("policy"), ["policy"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ validityDays: 7, waitCostPerHour: 25 });
  });
  it("reserva la lectura de política global para ADMIN", async () => {
    asRole("SUCURSAL_ADMIN");
    expect((await rentalOperation(request("policy"), ["policy"])).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("el cliente no recibe gastos internos de la cotización", async () => {
    const r = await rentalOperation(request("quotes"), ["quotes"]);
    expect(r.status).toBe(200);
    const q = (await r.json())[0];
    expect(q.estimatedCost).toBeUndefined();
    expect(q.priceComponents).toBeUndefined();
    expect(q.finalPrice).toBe(1000);
  });
  it("CASHIER no puede crear ni aprobar cotizaciones", async () => {
    asRole("CAJERO");
    expect((await rentalOperation(request("quotes/admin", {}), ["quotes", "admin"])).status).toBe(
      403,
    );
    expect(
      (await rentalOperation(request("quotes/40/approve", {}), ["quotes", "40", "approve"])).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("el pago confirmado no inventa un rentalId cuando el registro sigue pendiente", async () => {
    overrides["POST payments/rentals"] = {
      invoiceId: 10,
      quoteId: 40,
      paymentStatus: "PAID",
      rentalId: null,
    };
    const r = await rentalOperation(
      request("payments", { quoteId: 40, paymentDate: "2026-11-01" }),
      ["payments"],
    );
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({
      invoiceId: 10,
      quoteId: 40,
      paymentStatus: "PAID",
      rentalId: null,
    });
    expect(writes()[0]?.[1].headers["Idempotency-Key"]).toBe(key);
  });
  it("CUSTOMER no puede solicitar cancelación empresarial al 100%", async () => {
    expect(
      (
        await rentalOperation(
          request("contracts/60/cancel", { cause: "BUSINESS_INCIDENT", reason: "Empresa" }),
          ["contracts", "60", "cancel"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("no permite cancelar el retorno después de iniciar la ida", async () => {
    overrides["GET rentals/60"] = {
      ...rental,
      legs: [
        {
          ...leg,
          busId: 5,
          driverId: 8,
          operatingBranchId: 2,
          status: "IN_TRANSIT",
          departure: { actualDepartureAt: quote.departureAt, startKm: 1000 },
        },
      ],
    };
    expect(
      (
        await rentalOperation(
          request("contracts/60/cancel", { cause: "VOLUNTARY", reason: "Cambio" }),
          ["contracts", "60", "cancel"],
        )
      ).status,
    ).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it("el estado COMPLETED requiere que todos los tramos estén completados", () => {
    expect(RentalContractSchema.safeParse({ ...rental, status: "COMPLETED" }).success).toBe(false);
  });
  it("no permite dos tramos de ida en el mismo alquiler", () => {
    expect(
      RentalContractSchema.safeParse({ ...rental, legs: [leg, { ...leg, tripId: 51 }] }).success,
    ).toBe(false);
  });
  it("la gestión de una sucursal no alcanza a contratos de otra gestora", async () => {
    asRole("SUCURSAL_ADMIN");
    overrides["GET rentals/60"] = { ...rental, managingBranchId: 3 };
    expect(
      (await rentalOperation(request("contracts/60", undefined, "branchId=2"), ["contracts", "60"]))
        .status,
    ).toBe(403);
  });
});
describe("Etapa 7: taller, reportes y precisión", () => {
  it("lee la demanda desde rows y conserva los conteos del servicio", async () => {
    asRole("ADMIN");
    const rows = [{ routeId: 1, originBranchId: 2, soldNotCancelledCount: 4 }];
    overrides["GET reports/routes-demand"] = {
      report: "routes-demand",
      rows,
      branches: [],
      subtotals: {},
      grandTotal: null,
    };
    const response = await analyticsOperation(request("routes-demand"), "routes-demand");
    expect(response.status).toBe(200);
    expect((await response.json()).sections[0].rows).toEqual(rows);
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN"])(
    "lee las categorías y sus líneas desde rows como %s",
    async (role) => {
      asRole(role);
      const local = role === "SUCURSAL_ADMIN";
      const path = local ? "branch-operations" : "workshop-categories";
      overrides[`GET reports/${path}`] = {
        report: local ? "WORKSHOP" : "workshop-categories",
        filters: { branchId: local ? 2 : null },
        rows: [
          {
            categoryId: 1,
            categoryName: "Repuestos",
            subtotal: "25.00",
            lines: [{ branchId: 2, busId: 5, description: "Filtro", amount: "25.00" }],
          },
        ],
        subtotals: { "1": "25.00" },
        grandTotal: "25.00",
      };
      const response = await analyticsOperation(
        request(path, undefined, local ? "branchId=2&kind=WORKSHOP" : ""),
        path,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        grandTotal: "25.00",
        sections: [{ title: "Repuestos", subtotal: "25.00", rows: [{ amount: "25.00" }] }],
      });
    },
  );
  it.each([
    {
      kind: "TICKET_SALES",
      row: { invoiceId: 1, date: "2026-11-04", amount: "75.00" },
      expected: { occurredAt: "2026-11-04", amount: "75.00" },
    },
    {
      kind: "RENTALS",
      row: { rentalId: 1, customer: "Cliente", amount: "75.00" },
      expected: { customerName: "Cliente", amount: "75.00" },
    },
    {
      kind: "DEPRECIATION",
      row: {
        tripId: 1,
        kmDistance: 100,
        depreciationRateApplied: "0.1250",
        depreciationCost: "12.50",
      },
      expected: { distanceKm: 100, ratePerKmApplied: "0.1250", depreciationCost: "12.50" },
    },
  ])("lee el reporte $kind con sus subtotales por sucursal", async ({ kind, row, expected }) => {
    asRole("SUCURSAL_ADMIN");
    overrides["GET reports/branch-operations"] = {
      report: kind,
      filters: { branchId: 2 },
      rows: [row],
      subtotals: { "2": "75.00" },
      grandTotal: "75.00",
    };
    const response = await analyticsOperation(
      request("branch-operations", undefined, `branchId=2&kind=${kind}`),
      "branch-operations",
    );
    expect(response.status).toBe(200);
    const report = await response.json();
    expect(report.sections[0].rows[0]).toMatchObject(expected);
    expect(report.sections[1].subtotal).toBe("75.00");
  });
  it("rechaza una respuesta de Analytics atribuida a otra sucursal", async () => {
    asRole("SUCURSAL_ADMIN");
    overrides["GET reports/branch-operations"] = {
      report: "RENTALS",
      filters: { branchId: 3 },
      rows: [],
      subtotals: {},
      grandTotal: "0.00",
    };
    expect(
      (
        await analyticsOperation(
          request("branch-operations", undefined, "branchId=2&kind=RENTALS"),
          "branch-operations",
        )
      ).status,
    ).toBe(403);
  });
  it.each([
    { routes: [] },
    {
      routes: [
        { routeId: 1, origin: { lat: 14.6, lng: -90.5 }, destination: { lat: 14.7, lng: -90.5 } },
      ],
    },
  ])("lee las rutas desde rows del reporte de Analytics: %j", async ({ routes }) => {
    asRole("ADMIN");
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 2, dateFrom: null, dateTo: null },
      rows: routes,
      branches: [],
      subtotals: {},
      grandTotal: null,
    };
    const response = await analyticsOperation(
      request("route-map", undefined, "originBranchId=2"),
      "route-map",
    );
    expect(response.status).toBe(200);
    expect((await response.json()).mapRoutes).toEqual(routes);
  });
  it("rechaza un mapa que Analytics atribuye a otro origen", async () => {
    asRole("ADMIN");
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 3 },
      rows: [],
    };
    expect(
      (await analyticsOperation(request("route-map", undefined, "originBranchId=2"), "route-map"))
        .status,
    ).toBe(502);
  });
  it("conserva columnas exigidas de cliente/vendedor, flota y tarifa histórica sin exponer DPI", () => {
    const row = ReportRowSchema.parse({
      sellerUserId: 7,
      ticketCount: 2,
      customerName: "Cliente Real",
      brand: "Volvo",
      model: "Touring",
      capacity: 40,
      distanceKm: 100,
      ratePerKmApplied: "0.1250",
      paidAmount: "1000.00",
      dpi: "NO-DEBE-SALIR",
    });
    expect(row).toMatchObject({
      sellerUserId: 7,
      ticketCount: 2,
      customerName: "Cliente Real",
      brand: "Volvo",
      model: "Touring",
      capacity: 40,
      distanceKm: 100,
      ratePerKmApplied: "0.1250",
      paidAmount: "1000.00",
    });
    expect(row).not.toHaveProperty("dpi");
    expect(ReportRowSchema.safeParse({ dpi: "NO-DEBE-SALIR" }).success).toBe(false);
  });
  it("rechaza mantenimiento de bus ajeno antes de escribir", async () => {
    asRole("SUCURSAL_ADMIN");
    expect(
      (
        await maintenanceOperation(
          request(
            "services",
            {
              busId: 99,
              serviceDate: "2026-11-01",
              lines: [{ categoryId: 1, lineType: "PART", description: "Filtro", amount: 25 }],
            },
            "branchId=2",
          ),
          ["services"],
        )
      ).status,
    ).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it("registra detalles de taller y usa el total del proveedor", async () => {
    asRole("SUCURSAL_ADMIN");
    const input = {
      busId: 5,
      serviceDate: "2026-11-01",
      lines: [{ categoryId: 1, lineType: "LABOR", description: "Revisión", amount: 25 }],
    };
    overrides["POST workshop-services"] = {
      ...input,
      branchId: 2,
      workshopServiceId: 80,
      totalAmount: 25,
      lines: input.lines.map((line) => ({ ...line, lineId: 1 })),
    };
    expect(
      (await maintenanceOperation(request("services", input, "branchId=2"), ["services"])).status,
    ).toBe(201);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual(input);
    expect(
      mocks.fetch.mock.calls.some(([url]) => String(url).includes("expense-categories?branchId=2")),
    ).toBe(true);
  });
  it("no permite registrar una línea sin categoría activa", async () => {
    asRole("SUCURSAL_ADMIN");
    overrides["GET expense-categories"] = [{ categoryId: 1, name: "Repuestos", active: false }];
    expect(
      (
        await maintenanceOperation(
          request(
            "services",
            {
              busId: 5,
              serviceDate: "2026-11-01",
              lines: [{ categoryId: 1, lineType: "PART", description: "Filtro", amount: 25 }],
            },
            "branchId=2",
          ),
          ["services"],
        )
      ).status,
    ).toBe(422);
    expect(writes()).toHaveLength(0);
  });
  it.each(["CUSTOMER", "CAJERO", "DRIVER", "SUCURSAL_ADMIN"])(
    "%s no accede al informe global",
    async (role) => {
      asRole(role);
      expect((await analyticsOperation(request("income"), "income")).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("preserva decimales exactos en totales, sin conversión a Number", async () => {
    asRole("ADMIN");
    overrides["GET reports/income"] = {
      branches: [
        {
          branchId: 2,
          branchName: "Central",
          entries: [{ amount: "999999999999.99", documentRef: "F-1" }],
          subtotal: "999999999999.99",
        },
      ],
      grandTotal: "999999999999.99",
    };
    const r = await analyticsOperation(request("income"), "income");
    expect(r.status).toBe(200);
    expect((await r.json()).grandTotal).toBe("999999999999.99");
    expect(decimalDisplay("999999999999.99")).toBe("999,999,999,999.99");
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/reports\/income\?$/);
  });
  it("no acepta un importe numérico en Analytics", async () => {
    asRole("ADMIN");
    overrides["GET reports/income"] = { branches: [], grandTotal: 100 };
    expect((await analyticsOperation(request("income"), "income")).status).toBe(502);
  });
  it("rechaza rangos invertidos y filtros que el informe no admite", async () => {
    asRole("ADMIN");
    expect(
      (
        await analyticsOperation(
          request("income", undefined, "dateFrom=2026-11-02&dateTo=2026-11-01"),
          "income",
        )
      ).status,
    ).toBe(400);
    expect(
      (await analyticsOperation(request("income", undefined, "busId=5"), "income")).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("no acepta una sucursal ajena para un informe de operaciones", async () => {
    asRole("SUCURSAL_ADMIN");
    expect(
      (
        await analyticsOperation(
          request("branch-operations", undefined, "branchId=3&kind=RENTALS"),
          "branch-operations",
        )
      ).status,
    ).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it("un mapa con posiciones duplicadas o fuera de la distribución se rechaza", () => {
    expect(SeatMapSchema.safeParse({ ...map, seats: [map.seats[0], map.seats[0]] }).success).toBe(
      false,
    );
    expect(
      SeatMapSchema.safeParse({ ...map, seats: [{ row: 2, column: 1, state: "AVAILABLE" }] })
        .success,
    ).toBe(false);
  });
  it.each([
    "/api/commerce/wallet",
    "/api/rentals/quotes",
    "/api/maintenance/services",
    "/api/analytics/income",
    "/customer/rentals",
    "/branch-admin/reports",
    "/cashier/pos",
  ])("habilita %s con no-store", (path) => {
    const r = middleware(new NextRequest("http://localhost:3000" + path));
    expect(r.headers.get("x-middleware-next")).toBe("1");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});

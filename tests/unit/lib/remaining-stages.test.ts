// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { commerceOperation } from "@/lib/api/commerce-operations";
import { rentalOperation } from "@/lib/api/rental-operations";
import { maintenanceOperation } from "@/lib/api/maintenance-operations";
import { analyticsOperation } from "@/lib/api/analytics-operations";
import { SeatMapSchema, RefundSchema, CancellationPolicySchema } from "@/lib/validators/commerce";
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
  busId: 5,
  seatRows: 1,
  seatColumns: 3,
  capacity: 2,
  seats: [
    { row: 1, column: 1, state: "AVAILABLE" },
    { row: 1, column: 2, state: "BLOCKED", reason: "Asiento dañado" },
  ],
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
        branches: [branch],
        "wallets/me": { balance: 100, active: true },
        "wallets/me/transactions": [],
        "payments/me": [invoice],
        "payments/10/tickets": { invoice, tickets: [ticket] },
        "seats/trips/20": map,
        "customers/by-nit/1234567": {
          customerId: 999,
          nit: "1234567",
          fullName: "Cliente Real",
          hasUser: true,
          email: "verified@example.com",
        },
        "refunds/me": [refund],
        "refunds/claim": refund,
        "refunds/30": refund,
        "rental-quotes/me": [quote],
        "rental-quotes/admin": [quote],
        "rental-quotes/payable": [quote],
        "rental-quotes/40": quote,
        "rentals/me": [rental],
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
    const r = await commerceOperation(request("wallet/recharges", { amount: 25 }), [
      "wallet",
      "recharges",
    ]);
    expect(r.status).toBe(201);
    expect(writes()[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "Idempotency-Key": key }),
      body: JSON.stringify({ amount: 25 }),
    });
  });
  it("rechaza una recarga sin llave de operación", async () => {
    expect(
      (
        await commerceOperation(request("wallet/recharges", { amount: 25 }, "", "POST", null), [
          "wallet",
          "recharges",
        ])
      ).status,
    ).toBe(400);
    expect(writes()).toHaveLength(0);
  });
  it.each([
    { amount: 0 },
    { amount: -1 },
    { amount: 1.001 },
    { amount: 20, ownerId: 99 },
    { amount: 20, paymentDate: "2026-11-01" },
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
  it("no acepta que el cajero opere otra sucursal desde query", async () => {
    asRole("CAJERO");
    expect(
      (await commerceOperation(request("context", undefined, "branchId=3"), ["context"])).status,
    ).toBe(403);
  });
  it("rechaza contexto ambiguo si el cajero tiene dos sucursales", async () => {
    asRole("CAJERO");
    overrides["GET users/7/branches"] = [2, 3];
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
      initializedAt: "2026-11-01T09:00:00-06:00",
    };
    expect(
      (await commerceOperation(request("cash/open", { amount: 0 }, "branchId=2"), ["cash", "open"]))
        .status,
    ).toBe(200);
    expect(writes()).toHaveLength(1);
  });
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
  it("rechaza compras CF en el historial personal aunque coincida un correo", async () => {
    overrides["GET payments/me"] = [{ ...invoice, customerNit: "CF" }];
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
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual({ delivered: true });
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
    overrides["POST workshop-services"] = { ...input, workshopServiceId: 80, totalAmount: 25 };
    expect(
      (await maintenanceOperation(request("services", input, "branchId=2"), ["services"])).status,
    ).toBe(201);
    expect(JSON.parse(writes()[0]?.[1].body)).toEqual(input);
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
  it("un mapa con posiciones duplicadas o fuera de capacidad se rechaza", () => {
    expect(SeatMapSchema.safeParse({ ...map, seats: [map.seats[0], map.seats[0]] }).success).toBe(
      false,
    );
    expect(SeatMapSchema.safeParse({ ...map, capacity: 4 }).success).toBe(false);
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

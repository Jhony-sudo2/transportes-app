import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect as playwrightExpect } from "@playwright/test";
const expect = playwrightExpect.configure({ timeout: 20000 });
const production = process.argv.includes("--production");
const require = createRequire(import.meta.url),
  host = "127.0.0.1",
  appPort = 3320,
  apiPort = 3321,
  base = `http://localhost:${appPort}`,
  temporaryConfig = ".next-completion-check.tsconfig.json";
const branches = [
  { id: 2, name: "Central", active: true, latitude: 14.6, longitude: -90.5 },
  { id: 3, name: "Norte", active: true, latitude: 15.4, longitude: -90.3 },
];
const bus = {
  id: 5,
  plateNumber: "C123ABC",
  brand: "Volvo",
  model: "Touring",
  capacity: 40,
  currentKm: 1000,
  seatRows: 10,
  seatColumns: 4,
  state: "AVAILABLE",
  busTypeId: 1,
  rentalEnabled: true,
  photo: "",
};
const driver = {
  id: 8,
  userId: 80,
  name: "Juan",
  lastName: "Chofer",
  email: "driver@example.com",
  status: "ACTIVE",
  photo: "",
  number: "LIC-123",
  expirationDate: "2032-01-01",
  licenseTypeName: "A",
};
const busTypes = [
  {
    id: 1,
    name: "Ejecutivo",
    capacity: 40,
    active: true,
    description: "Viajes privados y regulares",
    fuelEstimatePerKm: 2,
    depreciationPerKm: 0.2,
    suggestedDriverSalaryPerTrip: 120,
  },
];
const route = {
  routeId: 10,
  originBranchId: 2,
  destinationBranchId: 3,
  distanceKm: 100,
  ticketPrice: 50,
};
const regular = {
  tripId: 20,
  tripType: "REGULAR",
  status: "SCHEDULED",
  route,
  operatingBranchId: 2,
  rentalId: null,
  busId: 5,
  driverId: 8,
  scheduledDepartureAt: "2030-05-01T09:00:00-06:00",
  scheduledArrivalAt: "2030-05-01T12:00:00-06:00",
  price: 50,
  driverBaseSalarySnapshot: 120,
  departure: null,
  arrival: null,
};
const profiles = {
  customer: { id: 7, role: { id: 2, name: "CUSTOMER" } },
  admin: { id: 1, role: { id: 1, name: "ADMIN" } },
  branch: { id: 3, role: { id: 3, name: "SUCURSAL_ADMIN" } },
  cashier: { id: 9, role: { id: 5, name: "CASHIER" } },
  driver: { id: 80, role: { id: 4, name: "DRIVER" } },
};
let walletBalance = 100,
  rechargeCommits = 0,
  ticketCommits = 0,
  rentalCommits = 0,
  lostRecharge = true;
const transactions = [],
  invoices = [],
  tickets = [],
  holds = new Map(),
  memo = new Map(),
  quotes = [],
  rentals = [],
  services = [],
  movements = [],
  categories = [{ categoryId: 1, name: "Repuestos", active: true }];
const cash = { branchId: 2, balance: 0, initializedAt: null },
  failures = [];
const foreignRefund = {
  refundId: 90,
  invoiceId: 900,
  ticketId: 901,
  rentalId: null,
  refundCode: "OTHER-BRANCH",
  cause: "TRIP_CANCELLED",
  appliedPercent: 100,
  amount: 25,
  status: "PENDING",
  method: null,
  settledAt: null,
  reason: "Viaje cancelado de otra sucursal",
};
const refunds = [foreignRefund];
const timestamp = () => new Date().toISOString();
function invoiceFor({
  customerId = 999,
  nit = "1234567",
  name = "Cliente Real",
  channel = "WEB",
  total = 50,
  typeInvoice = "TICKET_PAYMENT",
  quoteId = null,
  contactEmailStatus = "VERIFIED",
} = {}) {
  const result = {
    invoiceId: 10 + invoices.length,
    customerId,
    customerNit: nit,
    customerName: name,
    totalAmount: total,
    paymentDate: "2026-11-01",
    channel,
    sourceBranchId: channel === "WEB" ? null : 2,
    revenueBranchId: 2,
    sellerUserId: channel === "WEB" ? null : 9,
    state: "PAID",
    typeInvoice,
    contactEmailStatus,
    rentalId: null,
    quoteId,
  };
  invoices.push(result);
  return result;
}
function seatMap() {
  return {
    tripId: 20,
    busId: 5,
    seatRows: 1,
    seatColumns: 4,
    capacity: 3,
    seats: [
      {
        row: 1,
        column: 1,
        state: tickets.some((t) => t.tripId === 20 && !t.cancelled)
          ? "SOLD"
          : [...holds.values()].some((h) => h.active && Date.parse(h.expiresAt) > Date.now())
            ? "HELD"
            : "AVAILABLE",
      },
      { row: 1, column: 2, state: "BLOCKED", reason: "Asiento en revisión" },
      { row: 1, column: 3, state: "SOLD" },
    ],
  };
}
function registerRental() {
  const q = quotes[0],
    invoice = invoices.find((i) => i.quoteId === q.quoteId);
  assert.ok(invoice);
  q.status = "PAID";
  q.rentalId = 60;
  q.invoiceId = invoice.invoiceId;
  invoice.rentalId = 60;
  rentals.push({
    rentalId: 60,
    quoteId: q.quoteId,
    invoiceId: invoice.invoiceId,
    customerId: 999,
    managingBranchId: 2,
    status: "PAID",
    cancelledAt: null,
    cancellationPreview: {
      VOLUNTARY: { eligible: true, amount: 750, appliedPercent: 75 },
      BUSINESS_INCIDENT: { eligible: true, amount: 1000, appliedPercent: 100 },
    },
    legs: [
      {
        ...regular,
        tripId: 50,
        tripType: "PRIVATE",
        route: null,
        price: null,
        rentalId: 60,
        operatingBranchId: null,
        busId: null,
        driverId: null,
        legType: "OUTBOUND",
        scheduledDepartureAt: q.departureAt,
        scheduledArrivalAt: q.outboundArrivalEstimateAt,
      },
      {
        ...regular,
        tripId: 51,
        tripType: "PRIVATE",
        route: null,
        price: null,
        rentalId: 60,
        operatingBranchId: null,
        busId: null,
        driverId: null,
        legType: "RETURN",
        scheduledDepartureAt: q.returnDepartureAt,
        scheduledArrivalAt: q.returnArrivalEstimateAt,
      },
    ],
  });
}
const api = http.createServer(async (request, response) => {
  const send = (body, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  try {
    const url = new URL(request.url, `http://${host}:${apiPort}`),
      path = url.pathname.replace(/^\/api\/v1\//, ""),
      token = request.headers.authorization?.replace(/^Bearer /, ""),
      profile = profiles[token];
    if (path === "users/profile")
      return send(
        profile
          ? {
              ...profile,
              name: token === "driver" ? "Juan" : "Ana",
              lastName: "Pruebas",
              email: `${token}@example.com`,
              nit: "1234567",
              isActive: true,
              resetPassword: false,
              twoFactorEnabled: false,
              branchIds: [2],
              ...(token === "customer" ? { customerId: 999 } : {}),
            }
          : {},
        profile ? 200 : 401,
      );
    if (/^users\/\d+\/branches$/.test(path)) return send([2]);
    if (path === "branches") return send(branches);
    if (/^branches\/\d+$/.test(path))
      return send(branches.find((b) => b.id === Number(path.split("/")[1])));
    if (path === "bus-types") return send(busTypes);
    if (path === "branches/2/buses") return send([bus]);
    if (path === "branches/2/drivers") return send([driver]);
    if (path === "drivers/me") return send(driver);
    if (path === "routes") return send([route]);
    if (path === "trips" && request.method === "GET") {
      const all = [regular, ...rentals.flatMap((r) => r.legs)];
      if (!profile)
        return send([
          {
            tripId: 20,
            routeId: 10,
            busId: 5,
            departureAt: regular.scheduledDepartureAt,
            price: 50,
            seatsAvailable: seatMap().seats.filter((s) => s.state === "AVAILABLE").length,
          },
        ]);
      return send(
        all.filter(
          (t) =>
            (!url.searchParams.has("tripType") ||
              t.tripType === url.searchParams.get("tripType")) &&
            (!url.searchParams.has("driverId") ||
              t.driverId === Number(url.searchParams.get("driverId"))) &&
            (!url.searchParams.has("operatingBranchId") ||
              t.operatingBranchId === Number(url.searchParams.get("operatingBranchId"))),
        ),
      );
    }
    if (/^trips\/\d+$/.test(path) && request.method === "GET")
      return send(
        [regular, ...rentals.flatMap((r) => r.legs)].find(
          (t) => t.tripId === Number(path.split("/")[1]),
        ),
      );
    if (!profile && !path.startsWith("invoices/contact-email/"))
      return send({ detail: "No autenticado" }, 401);
    if (request.method === "GET") {
      if (path === "wallets/me") return send({ balance: walletBalance, active: true });
      if (path === "wallets/me/transactions") return send(transactions);
      if (path === "seats/trips/20") return send(seatMap());
      if (path === "payments/me") return send(invoices.filter((i) => i.customerId === 999));
      if (/^payments\/\d+\/tickets$/.test(path)) {
        const id = Number(path.split("/")[1]);
        return send({
          invoice: invoices.find((i) => i.invoiceId === id),
          tickets: tickets.filter((t) => t.invoiceId === id),
        });
      }
      if (path === "refunds/me") return send(refunds.filter((r) => r.refundId !== 90));
      if (path === "refunds/claim") {
        const r = refunds.find((r) => r.refundCode === url.searchParams.get("code"));
        return send(r ?? { detail: "Código no encontrado" }, r ? 200 : 404);
      }
      if (/^refunds\/\d+$/.test(path))
        return send(refunds.find((r) => r.refundId === Number(path.split("/")[1])));
      if (path === "cancellation-policy")
        return send({ cutoffMinutes: 15, voluntaryRefundPercent: 75 });
      if (path === "cash/branches/2") return send(cash);
      if (path === "cash/branches/2/movements")
        return send({ items: movements, balance: cash.balance });
      if (path === "customers/by-nit/1234567")
        return send({
          customerId: 999,
          nit: "1234567",
          fullName: "Cliente Real",
          hasUser: true,
          email: "customer@example.com",
        });
      if (path === "customers/search")
        return send([{ customerId: 999, nit: "1234567", fullName: "Cliente Real", hasUser: true }]);
      if (path === "expense-categories") return send(categories);
      if (path === "workshop-services") return send(services);
      if (path === "rental-quotes/me" || path === "rental-quotes/admin") return send(quotes);
      if (path === "rental-quotes/payable")
        return send(quotes.filter((q) => q.status === "APPROVED"));
      if (/^rental-quotes\/\d+$/.test(path))
        return send(quotes.find((q) => q.quoteId === Number(path.split("/")[1])));
      if (path === "rental-quote-policy") return send({ validityDays: 7, waitCostPerHour: 25 });
      if (path === "rentals/me") return send(rentals);
      if (/^rentals\/\d+$/.test(path))
        return send(rentals.find((r) => r.rentalId === Number(path.split("/")[1])));
      if (path === "reports/income" || path === "reports/expenses")
        return send({
          branches: [
            {
              branchId: 2,
              branchName: "Central",
              entries: [
                {
                  documentRef: "F-10",
                  amount: "999999999999.99",
                  description: "Importe exacto de prueba",
                },
              ],
              subtotal: "999999999999.99",
            },
          ],
          grandTotal: "999999999999.99",
        });
      if (path === "reports/profit")
        return send({
          branches: [
            {
              branchId: 2,
              branchName: "Central",
              income: "50.00",
              refunds: "37.50",
              costs: "10.00",
              net: "2.50",
            },
          ],
          grandTotal: "2.50",
        });
      if (path === "reports/routes-demand")
        return send([
          {
            routeId: 10,
            originBranchId: 2,
            soldNotCancelledCount: tickets.filter((t) => !t.cancelled).length,
          },
        ]);
      if (path === "reports/workshop-categories")
        return send({
          categories: [
            {
              categoryId: 1,
              categoryName: "Repuestos",
              lines: [{ amount: "30.00", busId: 5, description: "Revisión de prueba" }],
              subtotal: "30.00",
            },
          ],
          grandTotal: "30.00",
        });
      if (path === "reports/route-map")
        return send([
          {
            routeId: 10,
            origin: { lat: 14.6, lng: -90.5 },
            destination: { lat: 15.4, lng: -90.3 },
          },
        ]);
      if (path === "reports/fleet-operations")
        return send({
          buses: [
            {
              busId: 5,
              branchId: 2,
              plateNumber: bus.plateNumber,
              currentKm: bus.currentKm,
              completedTrips: rentals.flatMap((r) => r.legs).filter((l) => l.status === "COMPLETED")
                .length,
            },
          ],
          drivers: [
            {
              driverId: 8,
              branchId: 2,
              name: driver.name,
              licenseNumber: driver.number,
              licenseExpirationDate: driver.expirationDate,
              completedTrips: 0,
            },
          ],
        });
      if (path === "reports/branch-operations")
        return send({
          rows: [{ documentRef: "W-1", branchId: 2, amount: "30.00", description: "Taller" }],
          subtotals: [{ label: "Bus C123ABC", amount: "30.00" }],
          grandTotal: "30.00",
        });
    }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = raw ? JSON.parse(raw) : {};
    const operation = request.headers["idempotency-key"],
      memoKey = `${request.method}:${path}:${operation}`;
    if (operation && memo.has(memoKey)) {
      const previous = memo.get(memoKey);
      if (previous.input !== JSON.stringify(input))
        return send(
          { detail: "Referencia reutilizada con datos diferentes", code: "IDEMPOTENCY_CONFLICT" },
          409,
        );
      return send(previous.body, previous.status);
    }
    const commit = (body, status = 200) => {
      if (operation)
        memo.set(memoKey, { input: JSON.stringify(input), body: structuredClone(body), status });
      return send(body, status);
    };
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (path === "wallets/me/recharges") {
      assert.deepEqual(Object.keys(input), ["amount"]);
      assert.ok(operation);
      walletBalance += input.amount;
      rechargeCommits++;
      transactions.push({
        id: transactions.length + 1,
        transactionType: "USER_RECHARGE",
        createdAt: timestamp(),
        amount: input.amount,
        description: "Recarga manual",
      });
      const body = { transactionId: transactions.length, balanceAfter: walletBalance };
      if (lostRecharge) {
        lostRecharge = false;
        memo.set(memoKey, { input: JSON.stringify(input), body, status: 200 });
        return send(
          {
            detail: "No se pudo confirmar la respuesta. Recupera la misma operación.",
            code: "DEPENDENCY_TIMEOUT",
          },
          503,
        );
      }
      return commit(body);
    }
    if (path === "seats/trips/20/holds") {
      assert.deepEqual(input.seats, [{ row: 1, column: 1 }]);
      assert.equal(seatMap().seats[0].state, "AVAILABLE");
      const hold = {
        holdId: `hold-${holds.size + 1}`,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        totalAmount: 50,
        active: true,
      };
      holds.set(hold.holdId, hold);
      return commit({ holdId: hold.holdId, expiresAt: hold.expiresAt, totalAmount: 50 }, 201);
    }
    if (path === "payments/tickets" || path === "payments/counter") {
      assert.ok(operation);
      const hold = holds.get(input.holdId);
      assert.ok(hold?.active);
      const counter = path.endsWith("counter");
      if (counter && cash.initializedAt === null)
        return send({ detail: "Caja no inicializada", code: "CASH_NOT_INITIALIZED" }, 409);
      if (!counter && walletBalance < hold.totalAmount)
        return send({ detail: "Saldo insuficiente", code: "WALLET_INSUFFICIENT" }, 422);
      const i = invoiceFor({
        channel: counter ? "IN_PERSON" : "WEB",
        ...(counter && input.nit === "CF"
          ? {
              customerId: 1,
              nit: "CF",
              name: "Consumidor Final",
              contactEmailStatus: input.contactEmail ? "PENDING" : "NOT_PROVIDED",
            }
          : {}),
      });
      i.paymentDate = input.paymentDate;
      hold.active = false;
      const t = {
        ticketId: 100 + tickets.length,
        invoiceId: i.invoiceId,
        tripId: 20,
        seatRow: 1,
        seatColumn: 1,
        amount: 50,
        cancelled: false,
        cancellationPreview: { eligible: true, amount: 37.5, appliedPercent: 75 },
      };
      tickets.push(t);
      ticketCommits++;
      if (counter) {
        cash.balance += 50;
        movements.push({
          kind: "TICKET_SALE",
          amount: 50,
          balanceAfter: cash.balance,
          createdAt: timestamp(),
        });
      } else {
        walletBalance -= 50;
        transactions.push({
          id: transactions.length + 1,
          transactionType: "TICKET_PAYMENT",
          createdAt: timestamp(),
          amount: 50,
          description: `Factura ${i.invoiceId}`,
        });
      }
      return commit(
        {
          invoiceId: i.invoiceId,
          totalAmount: 50,
          tickets: [t],
          ...(counter
            ? {
                customerId: i.customerId,
                sellerUserId: profile.id,
                sourceBranchId: 2,
                revenueBranchId: 2,
                paymentDate: input.paymentDate,
                contactEmailStatus: i.contactEmailStatus,
              }
            : {}),
        },
        201,
      );
    }
    if (/^tickets\/\d+\/cancel$/.test(path)) {
      const t = tickets.find((t) => t.ticketId === Number(path.split("/")[1]));
      assert.ok(t && !t.cancelled);
      t.cancelled = true;
      const r = {
        refundId: 30 + refunds.length,
        invoiceId: t.invoiceId,
        ticketId: t.ticketId,
        rentalId: null,
        refundCode: `CLAIM-${t.ticketId}`,
        cause: "VOLUNTARY",
        appliedPercent: 75,
        amount: 37.5,
        status: "PENDING",
        method: null,
        settledAt: null,
      };
      refunds.push(r);
      return commit({
        ticketId: t.ticketId,
        refundId: r.refundId,
        amount: r.amount,
        refundStatus: "PENDING",
      });
    }
    if (/^refunds\/\d+\/settle-(wallet|cash)$/.test(path)) {
      const r = refunds.find((r) => r.refundId === Number(path.split("/")[1]));
      assert.equal(r.status, "PENDING");
      const cashPayment = path.endsWith("cash");
      if (cashPayment) {
        assert.equal(input.delivered, true);
        assert.ok(cash.balance >= r.amount);
        cash.balance -= r.amount;
        r.paidBranchId = 2;
        r.processedByUserId = profile.id;
        movements.push({
          kind: "CASH_REFUND",
          amount: r.amount,
          balanceAfter: cash.balance,
          createdAt: timestamp(),
        });
      } else walletBalance += r.amount;
      r.status = "COMPLETED";
      r.method = cashPayment ? "CASH" : "WALLET";
      r.settledAt = timestamp();
      return commit(r);
    }
    if (path === "cash/branches/2/open") {
      assert.equal(cash.initializedAt, null);
      cash.balance = input.amount;
      cash.initializedAt = timestamp();
      if (input.amount > 0)
        movements.push({
          kind: "OPENING",
          amount: input.amount,
          balanceAfter: cash.balance,
          createdAt: timestamp(),
        });
      return commit(cash);
    }
    if (path === "cash/branches/2/capital-movements") {
      cash.balance += input.type === "IN" ? input.amount : -input.amount;
      assert.ok(cash.balance >= 0);
      movements.push({
        kind: input.type === "IN" ? "CAPITAL_IN" : "CAPITAL_OUT",
        amount: input.amount,
        balanceAfter: cash.balance,
        createdAt: timestamp(),
        reason: input.reason,
      });
      return commit(cash);
    }
    if (path === "rental-quotes") {
      quotes.push({
        ...input,
        quoteId: 40,
        customerId: 999,
        status: "PENDING_APPROVAL",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        finalPrice: null,
        managingBranchId: null,
        rentalId: null,
        invoiceId: null,
        estimatedCost: 800,
        priceComponents: [],
      });
      return commit(quotes[0], 201);
    }
    if (path === "rental-quotes/40/approve") {
      Object.assign(quotes[0], input, {
        status: "APPROVED",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      return commit(quotes[0]);
    }
    if (path === "payments/rentals") {
      assert.ok(operation);
      const q = quotes[0];
      if (walletBalance < q.finalPrice)
        return send(
          { detail: "Saldo insuficiente para el precio aprobado", code: "WALLET_INSUFFICIENT" },
          422,
        );
      assert.equal(rentalCommits, 0);
      walletBalance -= q.finalPrice;
      const i = invoiceFor({
        total: q.finalPrice,
        typeInvoice: "RENTAL_PAYMENT",
        quoteId: q.quoteId,
      });
      i.paymentDate = input.paymentDate;
      q.invoiceId = i.invoiceId;
      rentalCommits++;
      return commit(
        { invoiceId: i.invoiceId, quoteId: q.quoteId, paymentStatus: "PAID", rentalId: null },
        201,
      );
    }
    if (path === "rentals/60/assign") {
      const r = rentals[0];
      for (const leg of r.legs) {
        const chosen = leg.legType === "OUTBOUND" ? input.outbound : input.return;
        assert.equal(chosen.busId, 5);
        assert.equal(chosen.driverId, 8);
        leg.busId = 5;
        leg.driverId = 8;
        leg.operatingBranchId = 2;
        leg.driverBaseSalarySnapshot = chosen.driverBaseSalary ?? 120;
      }
      return commit(r);
    }
    if (/^trips\/\d+\/(departure|arrival)$/.test(path)) {
      const t = rentals.flatMap((r) => r.legs).find((t) => t.tripId === Number(path.split("/")[1]));
      assert.ok(t);
      if (path.endsWith("departure")) {
        assert.equal(t.status, "SCHEDULED");
        t.departure = input;
        t.status = "IN_TRANSIT";
      } else {
        assert.equal(t.status, "IN_TRANSIT");
        assert.ok(input.endKm >= t.departure.startKm);
        t.arrival = input;
        t.status = "COMPLETED";
        bus.currentKm = input.endKm;
        if (rentals[0].legs.every((l) => l.status === "COMPLETED")) rentals[0].status = "COMPLETED";
      }
      return send(t);
    }
    if (path === "workshop-services") {
      assert.equal(input.busId, 5);
      const service = {
        ...input,
        workshopServiceId: 80,
        totalAmount: input.lines.reduce((sum, l) => sum + l.amount, 0),
      };
      services.push(service);
      return commit(service, 201);
    }
    if (path === "expense-categories") {
      const c = { categoryId: categories.length + 1, ...input };
      categories.push(c);
      return commit(c, 201);
    }
    if (/^expense-categories\/\d+$/.test(path)) {
      const c = categories.find((c) => c.categoryId === Number(path.split("/")[1]));
      Object.assign(c, input);
      return commit(c);
    }
    if (path === "seats/restrictions") return commit({ restrictionId: 100, isActive: true }, 201);
    if (path === "seats/restrictions/100/deactivate")
      return commit({ restrictionId: 100, isActive: false });
    if (path.startsWith("invoices/contact-email/"))
      return send({ contactEmailStatus: path.endsWith("confirm") ? "VERIFIED" : "REJECTED" });
    return send({ detail: `No previsto: ${request.method} ${path}` }, 404);
  } catch (error) {
    failures.push(String(error));
    return send({ detail: "Error en escenario simulado" }, 500);
  }
});
let app,
  web,
  browser,
  ownsConfig = false;
try {
  if (!production && fs.existsSync(temporaryConfig))
    throw new Error("Ya existe configuración temporal de comprobación.");
  if (!production) {
    fs.writeFileSync(temporaryConfig, fs.readFileSync("tsconfig.json"));
    ownsConfig = true;
  }
  process.env.GATEWAY_URL = `http://${host}:${apiPort}`;
  await new Promise((resolve, reject) => {
    api.once("error", reject);
    api.listen(apiPort, host, resolve);
  });
  const next = (await import("next")).default,
    config = await require("next/dist/server/config").default(
      production
        ? require("next/constants").PHASE_PRODUCTION_SERVER
        : require("next/constants").PHASE_DEVELOPMENT_SERVER,
      process.cwd(),
    );
  config.distDir = production ? ".next-build" : ".next-completion-check";
  if (!production) config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: !production,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: config.distDir, typescript: config.typescript },
  });
  await app.prepare();
  web = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(appPort, host, resolve);
  });
  browser = await chromium.launch({ headless: true });
  async function actor(token, width = 1440) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      acceptDownloads: true,
    });
    await context.addCookies([{ name: "access_token", value: token, url: base }]);
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(String(error)));
    await page.route("**/tile.openstreetmap.org/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4c8AAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    return { context, page };
  }
  const customer = await actor("customer", 390),
    page = customer.page;
  await page.goto(base + "/customer/wallet");
  await expect(page.getByTestId("customer-wallet-balance")).toContainText("100.00");
  await page.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("25");
  await page.locator('input[name="_confirmation"]:visible').check();
  await page.getByRole("button", { name: "Confirmar recarga", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(
    page.getByRole("button", { name: "Recuperar misma operación", exact: true }),
  ).toBeEnabled();
  assert.equal(rechargeCommits, 1);
  await page.reload();
  await page.getByRole("button", { name: "Recuperar misma operación", exact: true }).click();
  await expect(page.getByText(/Recarga registrada\. Saldo confirmado/)).toBeVisible();
  assert.equal(rechargeCommits, 1);
  assert.equal(walletBalance, 125);
  await page.goto(base + "/customer/trips/20");
  await expect(
    page.getByRole("button", {
      name: "Fila 1, asiento 2: Bloqueado, Asiento en revisión",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Fila 1, asiento 1: Disponible", exact: true }).click();
  await page.getByRole("button", { name: "Retener asientos seleccionados", exact: true }).click();
  await expect(page.getByText("Total confirmado:", { exact: false })).toContainText("50.00");
  await page.getByLabel("Fecha de pago", { exact: true }).fill("2026-11-01");
  await page
    .getByLabel("Confirmo los datos y autorizo el débito por el total indicado.", { exact: true })
    .check();
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("heading", { name: "Compra confirmada", exact: true })).toBeVisible();
  assert.equal(ticketCommits, 1);
  assert.equal(walletBalance, 75);
  await page.getByRole("link", { name: "Ver e imprimir comprobante", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Factura #10", exact: true })).toBeVisible();
  await page.getByText("Cancelar este boleto", { exact: true }).click();
  await expect(page.getByText(/Importe exacto informado para cancelar: Q37.50/)).toBeVisible();
  await page.getByLabel("Motivo de cancelación (opcional)", { exact: true }).fill("Cambio de plan");
  await page
    .getByLabel(
      "Entiendo que se cancelará este boleto y se reconocerá un reembolso pendiente; no se abonará automáticamente.",
      { exact: true },
    )
    .check();
  await page.getByRole("button", { name: "Confirmar cancelación individual", exact: true }).click();
  await expect(page.getByText(/Boleto cancelado\. Reembolso/)).toBeVisible();
  assert.equal(walletBalance, 75);
  await page.goto(base + "/customer/refunds");
  await page.getByRole("button", { name: "Ver instrucciones de efectivo", exact: true }).click();
  await expect(
    page.getByText(/Consultar estas instrucciones mantiene el reembolso pendiente/),
  ).toBeVisible();
  assert.equal(walletBalance, 75);
  await page.getByText("Cobrar en mi billetera", { exact: true }).click();
  await page
    .getByLabel("Autorizo el abono irreversible de Q37.50 a mi billetera.", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Confirmar abono inmediato a billetera", exact: true })
    .click();
  await expect(page.getByText("Pagado por billetera", { exact: false })).toBeVisible();
  assert.equal(walletBalance, 112.5);
  await page.goto(base + "/customer/rentals");
  await page.getByRole("button", { name: "Solicitar cotización", exact: true }).click();
  await page.getByLabel("Incluir viaje de retorno", { exact: true }).check();
  await page.getByLabel("Origen", { exact: true }).fill("Guatemala");
  await page.getByLabel("Destino", { exact: true }).fill("Cobán");
  await page.getByLabel("Salida de ida (Guatemala)", { exact: true }).fill("2030-05-01T09:00");
  await page.getByLabel("Salida de retorno (Guatemala)", { exact: true }).fill("2030-05-02T09:00");
  await page.getByLabel("Pasajeros", { exact: true }).fill("20");
  await page.getByLabel("Tipo de bus", { exact: true }).selectOption("1");
  await page.locator('input[name="_confirmation"]:visible').check();
  await page.getByRole("button", { name: "Enviar solicitud de cotización", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cotización #40", exact: true })).toBeVisible();
  await expect(page.getByText("Estimado interno informado:", { exact: false })).toHaveCount(0);
  const admin = await actor("admin"),
    a = admin.page;
  await a.goto(base + "/system-admin/rentals");
  await a.getByText("Revisar y aprobar precio final", { exact: true }).click();
  await a.getByLabel("Sucursal gestora", { exact: true }).selectOption("2");
  await a.getByLabel("Kilómetros estimados de ida", { exact: true }).fill("100");
  await a.getByLabel("Kilómetros estimados de retorno", { exact: true }).fill("100");
  await a
    .getByLabel("Llegada estimada de ida (Guatemala)", { exact: true })
    .fill("2030-05-01T12:00");
  await a
    .getByLabel("Llegada estimada de retorno (Guatemala)", { exact: true })
    .fill("2030-05-02T12:00");
  await a.getByLabel("Precio final total aprobado (Q)", { exact: true }).fill("1000");
  await a.locator('input[name="_confirmation"]:visible').check();
  await a.getByRole("button", { name: "Confirmar aprobación", exact: true }).click();
  await expect(
    a.getByText("Precio aprobado. Su vigencia comienza desde la aprobación.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado de cotizaciones", exact: true }).click();
  await expect(page.getByText("Precio global: Q1000.00", { exact: true })).toBeVisible();
  await page
    .getByLabel("Autorizo el débito único del precio global desde mi billetera.", { exact: true })
    .check();
  await page.getByRole("button", { name: "Confirmar pago con billetera", exact: true }).click();
  await expect(
    page.getByText("Saldo insuficiente para el precio aprobado", { exact: true }),
  ).toBeVisible();
  assert.equal(rentalCommits, 0);
  await page.goto(base + "/customer/wallet");
  await page.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("1100");
  await page.locator('input[name="_confirmation"]:visible').check();
  await page.getByRole("button", { name: "Confirmar recarga", exact: true }).click();
  await expect(page.getByText(/Recarga registrada\. Saldo confirmado/)).toBeVisible();
  await page.goto(base + "/customer/rentals");
  await page
    .getByLabel("Autorizo el débito único del precio global desde mi billetera.", { exact: true })
    .check();
  await page.getByRole("button", { name: "Confirmar pago con billetera", exact: true }).click();
  await expect(page.getByText(/Pago confirmado; registro del alquiler en proceso/)).toBeVisible();
  assert.equal(rentalCommits, 1);
  await page.reload();
  await expect(page.getByText(/Pago confirmado; registro del alquiler en proceso/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar pago con billetera", exact: true }),
  ).toHaveCount(0);
  registerRental();
  await page.getByRole("button", { name: "Consultar estado de cotizaciones", exact: true }).click();
  await page.getByRole("link", { name: "Ver alquiler y tramos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ida · Viaje #50", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Retorno · Viaje #51", exact: true }),
  ).toBeVisible();
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/completion-mobile.png", fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const manager = await actor("branch"),
    b = manager.page;
  await b.goto(base + "/branch-admin/cash");
  await b.locator('input[name="_confirmation"]:visible').check();
  await b.getByRole("button", { name: "Confirmar apertura", exact: true }).click();
  await expect(b.getByText(/Inicializada:/)).toBeVisible();
  assert.equal(movements.length, 0);
  await b.getByLabel("Tipo de movimiento", { exact: true }).selectOption("IN");
  await b.getByLabel("Monto (Q)", { exact: true }).fill("200");
  await b.getByLabel("Motivo", { exact: true }).fill("Capital de caja");
  await b.locator('input[name="_confirmation"]:visible').check();
  await b.getByRole("button", { name: "Confirmar movimiento de capital", exact: true }).click();
  await expect(b.getByText("Capital de caja", { exact: true })).toBeVisible();
  assert.equal(cash.balance, 200);
  await b.goto(base + "/branch-admin/rentals/60");
  await b.getByText("Asignar recursos después del pago", { exact: true }).click();
  const out = b.getByRole("group", { name: "Recursos de Ida", exact: true }),
    back = b.getByRole("group", { name: "Recursos de Retorno", exact: true });
  await out.getByLabel("Bus", { exact: true }).selectOption("5");
  await out.getByLabel("Chofer", { exact: true }).selectOption("8");
  await back.getByLabel("Bus", { exact: true }).selectOption("5");
  await back.getByLabel("Chofer", { exact: true }).selectOption("8");
  await b.locator('input[name="_confirmation"]:visible').check();
  await b.getByRole("button", { name: "Confirmar asignación de tramos", exact: true }).click();
  await expect(
    b.getByText("Recursos confirmados para los tramos contratados.", { exact: true }),
  ).toBeVisible();
  await b.goto(base + "/branch-admin/maintenance");
  await b.getByRole("button", { name: "Registrar servicio de taller", exact: true }).click();
  await b.getByLabel("Categoría del detalle 1", { exact: true }).selectOption("1");
  await b.getByLabel("Descripción del detalle 1", { exact: true }).fill("Cambio de filtro");
  await b.getByLabel("Monto del detalle 1 (Q)", { exact: true }).fill("30");
  await b.getByLabel("Bus de la sucursal", { exact: true }).selectOption("5");
  await b.locator('input[name="_confirmation"]:visible').check();
  await b.getByRole("button", { name: "Confirmar servicio y gastos", exact: true }).click();
  await expect(
    b.getByText("Servicio #80 registrado. Total confirmado: Q30.00.", { exact: true }),
  ).toBeVisible();
  const cashier = await actor("cashier"),
    c = cashier.page;
  await c.goto(base + "/cashier/pos/20");
  await c.getByRole("button", { name: "Fila 1, asiento 1: Disponible", exact: true }).click();
  await c.getByRole("button", { name: "Retener asientos seleccionados", exact: true }).click();
  await c.getByLabel("Consumidor Final (CF)", { exact: true }).check();
  await c.getByLabel("Correo para entrega (opcional)", { exact: true }).fill("cf@example.com");
  await c.getByLabel("Fecha de pago", { exact: true }).fill("2026-11-01");
  await c
    .getByLabel("Confirmo los datos y la recepción del efectivo por el total indicado.", {
      exact: true,
    })
    .check();
  await c.getByRole("button", { name: "Confirmar cobro", exact: true }).click();
  await expect(c.getByRole("heading", { name: "Compra confirmada", exact: true })).toBeVisible();
  assert.equal(cash.balance, 250);
  assert.equal(ticketCommits, 2);
  assert.equal(invoices.at(-1).customerId, 1);
  assert.equal(invoices.at(-1).contactEmailStatus, "PENDING");
  await c.goto(base + "/cashier/refunds");
  await c.getByLabel("Código exacto del comprobante", { exact: true }).fill("OTHER-BRANCH");
  await c.getByRole("button", { name: "Consultar devolución", exact: true }).click();
  await c
    .getByLabel("Verifiqué el comprobante y confirmo la entrega física del efectivo", {
      exact: true,
    })
    .check();
  await c
    .getByLabel("Confirmo una única entrega por el importe del reembolso.", { exact: true })
    .check();
  await c.getByRole("button", { name: "Registrar pago en efectivo", exact: true }).click();
  await expect(c.getByText("Pagado por efectivo", { exact: false })).toBeVisible();
  assert.equal(cash.balance, 225);
  assert.equal(foreignRefund.paidBranchId, 2);
  await c.goto(base + "/cashier/seat-restrictions");
  await c.getByLabel("Viaje", { exact: true }).selectOption("20");
  await c.getByLabel("Fila", { exact: true }).fill("1");
  await c.getByLabel("Asiento", { exact: true }).fill("1");
  await c.getByLabel("Motivo del bloqueo", { exact: true }).fill("Inspección de seguridad");
  await c.locator('input[name="_confirmation"]:visible').check();
  await c.getByRole("button", { name: "Confirmar bloqueo de asiento", exact: true }).click();
  await expect(c.getByText(/Bloqueo #100 habilitado/)).toBeVisible();
  const pilot = await actor("driver"),
    d = pilot.page;
  await d.goto(base + "/driver/trips");
  for (const [id, start, end, at] of [
    [50, 1000, 1100, "2030-05-01"],
    [51, 1100, 1200, "2030-05-02"],
  ]) {
    await d.getByRole("button", { name: `Registrar salida del viaje #${id}`, exact: true }).click();
    await d.getByLabel("Fecha y hora real (Guatemala)", { exact: true }).fill(at + "T08:30");
    await d.getByLabel("Kilometraje inicial", { exact: true }).fill(String(start));
    await d.getByRole("button", { name: "Confirmar datos", exact: true }).click();
    await expect(d.getByText("Salida registrada.", { exact: true })).toBeVisible();
    await d
      .getByRole("button", { name: `Registrar llegada del viaje #${id}`, exact: true })
      .click();
    await d.getByLabel("Fecha y hora real (Guatemala)", { exact: true }).fill(at + "T12:00");
    await d.getByLabel("Kilometraje final", { exact: true }).fill(String(end));
    await d.getByLabel("Gasto real de combustible (Q)", { exact: true }).fill("30");
    await d.getByRole("button", { name: "Confirmar datos", exact: true }).click();
    await expect(
      d.getByText("Llegada registrada. El viaje fue finalizado.", { exact: true }),
    ).toBeVisible();
    if (id === 50) assert.equal(rentals[0].status, "PAID");
  }
  assert.equal(rentals[0].status, "COMPLETED");
  assert.equal(bus.currentKm, 1200);
  assert.equal(rentalCommits, 1);
  await a.goto(base + "/system-admin/reports");
  await expect(a.getByText("Total general: Q999,999,999,999.99", { exact: true })).toBeVisible();
  const downloadPromise = a.waitForEvent("download");
  await a.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs("test-results/completion-report.pdf");
  assert.equal(
    fs.readFileSync("test-results/completion-report.pdf").subarray(0, 4).toString(),
    "%PDF",
  );
  const reports = a.getByRole("combobox", { name: "Reporte", exact: true });
  for (const kind of ["expenses", "profit", "routes-demand", "workshop-categories", "route-map"]) {
    const response = a.waitForResponse(
      (r) => r.url().includes(`/api/analytics/${kind}?`) && r.request().method() === "GET",
    );
    await reports.selectOption(kind);
    assert.equal((await response).status(), 200);
    await expect(a.getByRole("button", { name: "Exportar PDF", exact: true })).toBeVisible();
    if (kind === "route-map") await expect(a.locator(".leaflet-container")).toBeVisible();
  }
  await b.goto(base + "/branch-admin/reports");
  await expect(b.getByText("Buses de la sucursal", { exact: true })).toBeVisible();
  await b.getByRole("combobox", { name: "Reporte", exact: true }).selectOption("branch-operations");
  await expect(b.getByText("Total general: Q30.00", { exact: true })).toBeVisible();
  await page.goto(base + "/customer/purchases");
  await expect(page.getByText("NIT: CF", { exact: true })).toHaveCount(0);
  assert.equal(invoices.filter((i) => i.customerId === 999).length, 2);
  await Promise.all([
    customer.context.close(),
    admin.context.close(),
    manager.context.close(),
    cashier.context.close(),
    pilot.context.close(),
  ]);
  assert.deepEqual(failures, []);
  process.stdout.write(
    "PASS SOLO_CONTRATO: recuperación de recarga tras pérdida de respuesta/reload, compra y hold, cancelación pendiente, wallet, cotización/aprobación/pago único diferido, asignación/ida/retorno, caja/capital, CF/POS, reembolso intersucursal, bloqueos, taller, reportes, PDF y móvil.\n",
  );
} catch (error) {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (app) await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  if (web) {
    web.closeAllConnections();
    web.close();
  }
  api.closeAllConnections();
  api.close();
  if (ownsConfig && fs.existsSync(temporaryConfig)) fs.unlinkSync(temporaryConfig);
  process.exit(process.exitCode ?? 0);
}

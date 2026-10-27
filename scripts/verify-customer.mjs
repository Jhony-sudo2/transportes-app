import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3230,
  apiPort = 3231;
const base = "http://localhost:" + appPort;
const temporaryConfig = ".next-customer-check.tsconfig.json";
const user = {
  id: 7,
  customerId: 700,
  name: "Ana",
  lastName: "Cliente",
  email: "cliente@example.com",
  role: { id: 2, name: "CUSTOMER" },
  isActive: true,
  twoFactorEnabled: false,
  resetPassword: false,
  branchIds: [],
  phone: "55555555",
  nit: "CF",
  dpi: "1234567890123",
  adress: "Centro",
};
const users = new Map([
  ["customer-one", user],
  ["customer-two", { ...user, id: 8, customerId: 800, name: "Otra", email: "otra@example.com" }],
  ["customer-admin", { ...user, id: 9, role: { id: 1, name: "ADMIN" } }],
]);
const wallets = new Map([
  [7, { id: 41, amount: 100 }],
  [8, { id: 42, amount: 600 }],
]);
const transactions = new Map([
  [
    7,
    Array.from({ length: 12 }, (_, index) => ({
      id: 12 - index,
      transactionType: index % 2 ? "TICKET_PAYMENT" : "USER_RECHARGE",
      createdAt: "2026-10-25T10:00:00",
      amount: 10,
      description: "Movimiento " + (12 - index),
    })),
  ],
  [8, []],
]);
const invoices = Array.from({ length: 12 }, (_, index) => ({
  id: 10 + index,
  branchId: 2,
  userId: 7,
  totalAmount: 50,
  refundedAmount: null,
  paymentDate: "2026-10-25T09:30:00",
  chanel: "WEB",
  sellerUserId: null,
  typeInvoice: index === 1 ? "RENTAL_PAYMENT" : "TICKET_PAYMENT",
  customerNit: "CF",
  state: index === 2 ? "CANCELLED" : "PAID",
}));
invoices.push({ ...invoices[0], id: 99, userId: 8 });
const invoiceTickets = new Map(
  invoices.map((invoice) => [
    invoice.id,
    invoice.typeInvoice === "RENTAL_PAYMENT"
      ? []
      : [101, 102].map((id, index) => ({
          id: invoice.id === 10 ? id : invoice.id * 10 + index,
          invoiceId: invoice.id,
          amount: 25,
          position: { row: 1, column: 2 + index },
          paymentDate: invoice.paymentDate,
          state: invoice.state === "PAID" ? "PAID" : "CANCELLED",
        })),
  ]),
);
let cancellationAttempts = 0,
  cancellationWrites = 0,
  uncertainCancellation = false;
let rechargeAttempts = 0,
  rechargeWrites = 0,
  failWalletRead = true,
  failInvoiceRead = false;
const api = http.createServer(async (request, response) => {
  const send = (body, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  const current = users.get(request.headers.authorization?.replace(/^Bearer /, ""));
  if (!current) {
    send({}, 401);
    return;
  }
  if (request.url === "/api/v1/users/profile") {
    send(current);
    return;
  }
  const wallet = wallets.get(current.id);
  if (request.url === "/api/v1/wallets/me") {
    if (failWalletRead) {
      send({}, 503);
      return;
    }
    send(wallet);
    return;
  }
  if (request.url === "/api/v1/wallets/me/transactions") {
    send(transactions.get(current.id) ?? []);
    return;
  }
  if (request.url === "/api/v1/wallets/me/recharges" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const data = JSON.parse(raw);
    assert.deepEqual(Object.keys(data).sort(), ["amount", "rechargeDate"]);
    assert.match(data.rechargeDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    assert.ok(data.amount > 0);
    rechargeAttempts++;
    if (data.amount === 13) {
      send({ detail: "Monto de prueba rechazado." }, 400);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    wallet.amount += data.amount;
    const transaction = {
      id: 100 + rechargeWrites,
      transactionType: "USER_RECHARGE",
      amount: data.amount,
      createdAt: data.rechargeDate,
      description: "Recarga de billetera",
    };
    transactions.get(current.id).unshift(transaction);
    rechargeWrites++;
    if (data.amount === 15) {
      send({}, 503);
      return;
    }
    send(transaction, 201);
    return;
  }
  if (request.url === "/api/v1/payments/me") {
    if (failInvoiceRead) {
      send({}, 503);
      return;
    }
    send(invoices.filter((invoice) => invoice.userId === current.id));
    return;
  }
  if (request.url.startsWith("/api/v1/cancellations/") && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    cancellationAttempts++;
    const all = request.url.endsWith("/invoices");
    assert.deepEqual(Object.keys(input), [all ? "invoiceId" : "tickets"]);
    const invoice = all
      ? invoices.find((item) => item.id === input.invoiceId)
      : invoices.find((item) =>
          invoiceTickets.get(item.id).some((ticket) => input.tickets.includes(ticket.id)),
        );
    if (!invoice || invoice.userId !== current.id) {
      send({}, 403);
      return;
    }
    const tickets = invoiceTickets
      .get(invoice.id)
      .filter((ticket) => (all ? ticket.state === "PAID" : input.tickets.includes(ticket.id)));
    if (
      invoice.state !== "PAID" ||
      !tickets.length ||
      tickets.some((ticket) => ticket.state !== "PAID")
    ) {
      send({ detail: "Este ticket no puede cancelarse" }, 400);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    const amount = tickets.reduce((sum, ticket) => sum + ticket.amount, 0);
    for (const ticket of tickets) ticket.state = "CANCELLED";
    if (!invoiceTickets.get(invoice.id).some((ticket) => ticket.state === "PAID")) {
      invoice.state = "CANCELLED";
    }
    const refund = Math.round(amount * 50) / 100;
    invoice.refundedAmount = (invoice.refundedAmount ?? 0) + refund;
    wallet.amount += refund;
    transactions.get(current.id).unshift({
      id: 300 + cancellationWrites,
      transactionType: "REFUND",
      amount: refund,
      createdAt: invoice.paymentDate,
      description: "Devolucion por cancelacion propia de tickets",
    });
    cancellationWrites++;
    if (uncertainCancellation) {
      send({}, 503);
      return;
    }
    response.writeHead(204);
    response.end();
    return;
  }
  const match = request.url.match(/^\/api\/v1\/payments\/(\d+)(\/tickets)?$/);
  if (match) {
    const invoice = invoices.find((item) => item.id === Number(match[1]));
    if (!invoice) {
      send({}, 404);
      return;
    }
    if (invoice.userId !== current.id) {
      send({}, 403);
      return;
    }
    if (!match[2]) {
      send(invoice);
      return;
    }
    send(invoiceTickets.get(invoice.id));
    return;
  }
  send({}, 404);
});
let app,
  web,
  browser,
  ownsConfig = false;
try {
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe la configuración temporal de cliente.");
  fs.writeFileSync(temporaryConfig, fs.readFileSync("tsconfig.json"));
  ownsConfig = true;
  process.env.GATEWAY_URL = "http://" + host + ":" + apiPort;
  await new Promise((resolve, reject) => {
    api.once("error", reject);
    api.listen(apiPort, host, resolve);
  });
  const next = (await import("next")).default;
  const config = await require("next/dist/server/config").default(
    require("next/constants").PHASE_DEVELOPMENT_SERVER,
    process.cwd(),
  );
  config.distDir = ".next-customer-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-customer-check", typescript: { tsconfigPath: temporaryConfig } },
  });
  await app.prepare();
  web = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(appPort, host, resolve);
  });
  browser = await chromium.launch({ headless: true });
  fs.mkdirSync("test-results", { recursive: true });
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(base + "/customer/wallet");
  await expect(anonymousPage).toHaveURL(base + "/login");
  assert.equal((await anonymous.request.get(base + "/api/customer/purchases")).status(), 401);
  await anonymous.close();
  const admin = await browser.newContext();
  await admin.addCookies([{ name: "access_token", value: "customer-admin", url: base }]);
  assert.equal((await admin.request.get(base + "/customer/wallet")).status(), 404);
  assert.equal((await admin.request.get(base + "/api/customer/wallet")).status(), 403);
  assert.equal(
    (
      await admin.request.post(base + "/api/customer/wallet/recharges", {
        headers: { Origin: base },
        data: { amount: 10 },
      })
    ).status(),
    403,
  );
  await admin.close();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([{ name: "access_token", value: "customer-one", url: base }]);
  const page = await context.newPage();
  await page.goto(base + "/");
  await page.getByRole("banner").getByRole("link", { name: "Mi billetera", exact: true }).click();
  await expect(page).toHaveURL(base + "/customer/wallet");
  await expect(page.getByRole("heading", { name: "Tu saldo, a mano.", exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Commerce" })).toBeVisible();
  await expect(page.getByTestId("customer-wallet-balance")).toHaveCount(0);
  failWalletRead = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByTestId("customer-wallet-balance")).toHaveText("Q 100.00");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 de 2 · 12 registros", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/customer-wallet-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Recargar saldo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Recargar mi billetera", exact: true });
  await dialog.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Confirmar recarga", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("mayor que cero");
  assert.equal(rechargeAttempts, 0);
  await page.screenshot({ path: "test-results/customer-recharge-mobile.png", fullPage: true });
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("button", { name: "Recargar saldo", exact: true }).click();
  await dialog.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("25.50");
  await dialog
    .getByRole("button", { name: "Confirmar recarga", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(dialog.getByRole("button", { name: "Registrando…", exact: true })).toBeDisabled();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("customer-wallet-balance")).toHaveText("Q 125.50");
  await expect(
    page.getByRole("status").filter({ hasText: "registrada correctamente" }),
  ).toBeVisible();
  assert.equal(rechargeAttempts, 1);
  assert.equal(rechargeWrites, 1);
  await page.reload();
  await expect(page.getByTestId("customer-wallet-balance")).toHaveText("Q 125.50");
  await page.getByRole("button", { name: "Recargar saldo", exact: true }).click();
  await dialog.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("13");
  await dialog.getByRole("button", { name: "Confirmar recarga", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Monto de prueba rechazado.");
  await dialog.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("15");
  await dialog.getByRole("button", { name: "Confirmar recarga", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Revisa tu saldo");
  await expect(dialog.getByRole("button", { name: "Confirmar recarga", exact: true })).toHaveCount(
    0,
  );
  await dialog.getByRole("button", { name: "Revisar movimientos", exact: true }).click();
  await expect(page.getByTestId("customer-wallet-balance")).toHaveText("Q 140.50");
  assert.equal(rechargeAttempts, 3);
  assert.equal(rechargeWrites, 2);
  assert.equal(
    (
      await context.request.post(base + "/api/customer/wallet/recharges", {
        headers: { Origin: base },
        data: { amount: 20, walletId: 42 },
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await context.request.post(base + "/api/customer/wallet/recharges", {
        headers: { Origin: "https://otro.example" },
        data: { amount: 20 },
      })
    ).status(),
    403,
  );
  failInvoiceRead = true;
  await page.getByRole("banner").getByRole("link", { name: "Mis compras", exact: true }).click();
  await expect(page).toHaveURL(base + "/customer/purchases");
  await expect(page.getByRole("alert").filter({ hasText: "Commerce" })).toBeVisible();
  failInvoiceRead = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Factura #10", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("link", { name: "Factura #21", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await page.getByRole("link", { name: "Factura #10", exact: true }).click();
  await expect(page).toHaveURL(base + "/customer/purchases/10");
  await expect(page.getByRole("heading", { name: "Factura #10", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Ticket #101", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Ticket #102", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/customer-invoice-mobile.png", fullPage: true });
  await expect(
    page.getByRole("button", { name: "Cancelar seleccionados (0)", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: "Seleccionar ticket #101", exact: true }).check();
  await page.getByRole("button", { name: "Cancelar seleccionados (1)", exact: true }).click();
  const cancellation = page.getByRole("dialog", {
    name: "Cancelar tickets seleccionados",
    exact: true,
  });
  await expect(cancellation).toContainText("Reembolso estimado (50 %)");
  await expect(cancellation).toContainText("Q 12.50");
  await page.screenshot({ path: "test-results/customer-cancellation-mobile.png", fullPage: true });
  await cancellation.getByRole("button", { name: "Volver", exact: true }).click();
  assert.equal(cancellationAttempts, 0);
  await page.getByRole("button", { name: "Cancelar seleccionados (1)", exact: true }).click();
  await cancellation
    .getByRole("button", { name: "Confirmar cancelación", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(
    cancellation.getByRole("button", { name: "Cancelando…", exact: true }),
  ).toBeDisabled();
  await expect(cancellation).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Cancelación registrada" }),
  ).toBeVisible();
  await expect(page.getByRole("article", { name: "Ticket #101", exact: true })).toContainText(
    "Cancelado",
  );
  await expect(
    page.getByRole("checkbox", { name: "Seleccionar ticket #101", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Seleccionar ticket #102", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Detalle de la factura", exact: true }),
  ).toContainText("Q 50.00");
  await expect(
    page.getByText("Devuelto por cancelación propia", { exact: true }).locator(".."),
  ).toContainText("Q 12.50");
  assert.equal(cancellationAttempts, 1);
  assert.equal(cancellationWrites, 1);
  assert.equal(wallets.get(7).amount, 153);
  await page.reload();
  await expect(
    page.getByText("Devuelto por cancelación propia", { exact: true }).locator(".."),
  ).toContainText("Q 12.50");
  await page.getByRole("button", { name: "Cancelar todos los vigentes", exact: true }).click();
  const allCancellation = page.getByRole("dialog", {
    name: "Cancelar todos los tickets vigentes",
    exact: true,
  });
  await expect(allCancellation).toContainText("Se cancelarán 1 ticket(s)");
  await expect(allCancellation).toContainText("Q 12.50");
  await allCancellation.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
  await expect(allCancellation).toHaveCount(0);
  await expect(page.getByRole("article", { name: "Ticket #102", exact: true })).toContainText(
    "Cancelado",
  );
  await expect(
    page.getByRole("button", { name: "Cancelar todos los vigentes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ver opciones de devolución", exact: true }),
  ).toHaveCount(0);
  assert.equal(cancellationAttempts, 2);
  assert.equal(cancellationWrites, 2);
  assert.equal(wallets.get(7).amount, 165.5);
  await expect(
    page.getByText("Devuelto por cancelación propia", { exact: true }).locator(".."),
  ).toContainText("Q 25.00");
  await expect(
    page.getByRole("region", { name: "Detalle de la factura", exact: true }),
  ).toContainText("Q 50.00");
  const availableRefunds = await context.request.get(base + "/api/customer/refunds");
  assert.equal(availableRefunds.status(), 200);
  assert.ok(!(await availableRefunds.json()).some((item) => item.id === 10));
  assert.equal(
    (
      await context.request.post(base + "/api/customer/refunds/10", {
        headers: { Origin: base },
        data: { invoiceId: 10 },
      })
    ).status(),
    409,
  );
  await page.goto(base + "/customer/purchases/13");
  await page.getByRole("checkbox", { name: "Seleccionar ticket #130", exact: true }).check();
  await page.getByRole("button", { name: "Cancelar seleccionados (1)", exact: true }).click();
  uncertainCancellation = true;
  await cancellation.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
  await expect(cancellation.getByRole("alert")).toContainText("podría haberse registrado");
  await expect(
    cancellation.getByRole("button", { name: "Confirmar cancelación", exact: true }),
  ).toHaveCount(0);
  assert.equal(cancellationAttempts, 3);
  assert.equal(cancellationWrites, 3);
  await cancellation.getByRole("button", { name: "Actualizar tickets", exact: true }).click();
  await expect(page.getByRole("article", { name: "Ticket #130", exact: true })).toContainText(
    "Cancelado",
  );
  await expect(
    page.getByRole("checkbox", { name: "Seleccionar ticket #130", exact: true }),
  ).toHaveCount(0);
  uncertainCancellation = false;
  await page.getByRole("link", { name: "Ver mi billetera y movimientos", exact: true }).click();
  await expect(page.getByTestId("customer-wallet-balance")).toHaveText("Q 178.00");
  await page.goto(base + "/customer/purchases/10");
  await page.getByRole("link", { name: "Volver a mis compras", exact: true }).click();
  const cancelledPurchase = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Factura #10", exact: true }) });
  await expect(cancelledPurchase).toContainText("Q 50.00");
  await expect(cancelledPurchase).toContainText("Q 25.00");
  await page.getByRole("link", { name: "Factura #11", exact: true }).click();
  await expect(
    page.getByText("Esta factura corresponde a un alquiler y no contiene tickets.", {
      exact: true,
    }),
  ).toBeVisible();
  assert.equal((await context.request.get(base + "/api/customer/purchases/99")).status(), 403);
  await context.close();
  const second = await browser.newContext();
  await second.addCookies([{ name: "access_token", value: "customer-two", url: base }]);
  const secondPage = await second.newPage();
  await secondPage.goto(base + "/customer/wallet");
  await expect(secondPage.getByTestId("customer-wallet-balance")).toHaveText("Q 600.00");
  await expect(
    secondPage.getByText("Tu billetera todavía no tiene movimientos.", { exact: true }),
  ).toBeVisible();
  assert.equal((await second.request.get(base + "/api/customer/purchases/10")).status(), 403);
  await second.close();
  assert.equal(rechargeWrites, 2);
  process.stdout.write(
    "PASS: navegación de cliente, permisos, billetera, recargas, facturas, tickets, cancelación parcial y total con abono del 50%, estados persistentes, doble clic, resultado incierto sin reenvío, sin devolución duplicada, aislamiento entre clientes y vista móvil.\n",
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

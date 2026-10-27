import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3240,
  apiPort = 3241;
const base = "http://localhost:" + appPort;
const temporaryConfig = ".next-refunds-check.tsconfig.json";
const user = {
  id: 7,
  name: "Ana",
  lastName: "Cliente",
  email: "cliente@example.com",
  role: { id: 2, name: "CUSTOMER" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: false,
  branchIds: [],
};
const cashier = { ...user, id: 9, name: "Cajero", role: { id: 5, name: "CAJERO" }, branchIds: [2] };
const users = new Map([
  ["refund-customer", user],
  ["refund-cashier", cashier],
  ["refund-unassigned", { ...cashier, branchIds: [] }],
]);
const branch = { branchId: 2, branchName: "Central" };
const template = {
  id: 10,
  userId: 7,
  totalAmount: 50,
  paymentDate: "2026-10-26T10:00:00",
  chanel: "WEB",
  sellerUserId: 99,
  typeInvoice: "TICKET_PAYMENT",
  customerNit: "CF",
  state: "REFUND",
};
const invoices = [
  { ...template, ...branch },
  { ...template, ...branch, id: 11, state: "REIMBURSED" },
  { ...template, ...branch, id: 12, state: "PAID" },
  { ...template, ...branch, id: 13 }, // Insufficient branch balance.
  { ...template, ...branch, id: 14 }, // Write succeeds, response is lost.
  { ...template, ...branch, id: 15 },
  { ...template, ...branch, id: 20, userId: null, chanel: "IN_PERSON" },
  { ...template, id: 21, userId: null, branchId: 3, branchName: "Otra sucursal" },
];
let attempts = 0,
  writes = 0;
const invoiceResponse = (item) => {
  const { branchName: _branchName, ...invoice } = item;
  return invoice;
};
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  const actor = users.get(request.headers.authorization?.replace(/^Bearer /, ""));
  if (!actor) return send({}, 401);
  if (request.url === "/api/v1/users/profile") return send(actor);
  if (request.url === "/api/v1/payments/me")
    return send(invoices.filter((i) => i.userId === actor.id).map(invoiceResponse));
  const userBranches = request.url.match(/^\/api\/v1\/users\/(\d+)\/branches$/);
  if (userBranches) {
    if (Number(userBranches[1]) !== actor.id) return send({}, 403);
    return send(actor.branchIds);
  }
  if (request.url === "/api/v1/branches/2") return send({ id: 2, name: "Central" });
  const match = request.url.match(/^\/api\/v1\/payments\/(\d+)(\/tickets)?$/);
  if (match) {
    const item = invoices.find((i) => i.id === Number(match[1]));
    if (!item) return send({}, 404);
    if (
      item.userId !== actor.id &&
      item.sellerUserId !== actor.id &&
      !actor.branchIds.includes(item.branchId)
    )
      return send({}, 403);
    if (!match[2]) return send(invoiceResponse(item));
    return send([
      {
        id: item.id * 10,
        invoiceId: item.id,
        amount: 50,
        position: { row: 1, column: 2 },
        paymentDate: template.paymentDate,
      },
    ]);
  }
  if (
    request.method === "POST" &&
    ["/api/v1/refunds/web", "/api/v1/refunds/in-person"].includes(request.url)
  ) {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    assert.deepEqual(Object.keys(input), ["invoiceId"]);
    attempts++;
    const item = invoices.find((i) => i.id === input.invoiceId);
    if (!item) return send({}, 404);
    const web = request.url.endsWith("/web");
    if (
      web
        ? actor.role.name !== "CUSTOMER" || item.userId !== actor.id
        : actor.role.name !== "CAJERO" || item.branchId !== actor.branchIds[0]
    )
      return send({}, 403);
    if (item.state !== "REFUND") return send({ detail: "Ya reembolsada" }, 409);
    if (item.id === 13)
      return send({ detail: "Saldo insuficiente en la billetera de la sucursal" }, 409);
    await new Promise((resolve) => setTimeout(resolve, 300));
    item.state = "REIMBURSED";
    writes++;
    if (item.id === 14) return send({}, 503);
    return send(
      {
        id: 100 + writes,
        transactionType: "REFUND",
        amount: 50,
        createdAt: template.paymentDate,
        description: "Devolución",
      },
      201,
    );
  }
  send({}, 404);
});
let app,
  web,
  browser,
  ownsConfig = false;
try {
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe la configuración temporal de devoluciones.");
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
  config.distDir = ".next-refunds-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-refunds-check", typescript: { tsconfigPath: temporaryConfig } },
  });
  await app.prepare();
  web = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(appPort, host, resolve);
  });
  browser = await chromium.launch({ headless: true });
  const anonymous = await browser.newContext();
  const anonPage = await anonymous.newPage();
  await anonPage.goto(base + "/cashier/refunds");
  await expect(anonPage).toHaveURL(base + "/login");
  assert.equal((await anonymous.request.get(base + "/api/cashier/context")).status(), 401);
  await anonymous.close();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "access_token", value: "refund-customer", url: base }]);
  const page = await context.newPage();
  await page.goto(base + "/customer/refunds");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Devoluciones", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver factura #10", exact: true }).click();
  await page.getByRole("button", { name: "Cobrar presencialmente", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Presenta la factura #10 en Central" }),
  ).toBeVisible();
  assert.equal(attempts, 0);
  await page.getByRole("button", { name: "Recibir en mi billetera", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Confirmar devolución", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole("status").filter({ hasText: "Se abonaron Q 50.00" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recibir en mi billetera", exact: true }),
  ).toHaveCount(0);
  assert.equal(attempts, 1);
  assert.equal(writes, 1);
  await page.getByRole("link", { name: "Volver a mis devoluciones", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver factura #10", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reembolsadas", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver factura #10", exact: true })).toBeVisible();
  await page.goto(base + "/customer/refunds/14");
  await page.getByRole("button", { name: "Recibir en mi billetera", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Confirmar devolución", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Actualiza la factura");
  await expect(
    dialog.getByRole("button", { name: "Confirmar devolución", exact: true }),
  ).toHaveCount(0);
  assert.equal(attempts, 2);
  await dialog.getByRole("button", { name: "Actualizar factura", exact: true }).click();
  await expect(
    page.getByText("Esta factura ya fue reembolsada y no puede cobrarse nuevamente.", {
      exact: true,
    }),
  ).toBeVisible();
  assert.equal(attempts, 2);
  assert.equal((await context.request.get(base + "/api/customer/refunds/20")).status(), 403);
  assert.equal((await context.request.get(base + "/api/cashier/context")).status(), 403);
  await context.close();
  const cashContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await cashContext.addCookies([{ name: "access_token", value: "refund-cashier", url: base }]);
  const cash = await cashContext.newPage();
  await cash.goto(base + "/cashier/refunds");
  await expect(cash.getByLabel("Sucursal asignada", { exact: true })).toContainText("Central");
  await expect(cash.getByRole("combobox")).toHaveCount(0);
  async function search(id) {
    await cash.getByLabel("Número de factura", { exact: true }).fill(String(id));
    await cash.getByRole("button", { name: "Buscar factura", exact: true }).click();
  }
  await search(20);
  await expect(cash.getByText("Compra sin cuenta", { exact: true })).toBeVisible();
  assert.equal(
    await cash.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  fs.mkdirSync("test-results", { recursive: true });
  await cash.screenshot({ path: "test-results/cashier-refunds-mobile.png", fullPage: true });
  await cash.getByRole("button", { name: "Registrar entrega presencial", exact: true }).click();
  await cash
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(
    cash.getByRole("status").filter({ hasText: "Entrega presencial de Q 50.00 registrada" }),
  ).toBeVisible();
  assert.equal(attempts, 3);
  assert.equal(writes, 3);
  await search(15);
  await expect(cash.getByText("Cliente registrado", { exact: true })).toBeVisible();
  await cash.getByRole("button", { name: "Registrar entrega presencial", exact: true }).click();
  await cash
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .click();
  await expect(
    cash.getByRole("status").filter({ hasText: "Entrega presencial de Q 50.00 registrada" }),
  ).toBeVisible();
  await search(13);
  await cash.getByRole("button", { name: "Registrar entrega presencial", exact: true }).click();
  await cash
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .click();
  await expect(cash.getByRole("dialog").getByRole("alert")).toContainText("Saldo insuficiente");
  await cash
    .getByRole("dialog")
    .getByRole("button", { name: "Actualizar factura", exact: true })
    .click();
  await search(21);
  await expect(cash.getByRole("alert").filter({ hasText: "No tienes acceso" })).toBeVisible();
  await expect(
    cash.getByRole("button", { name: "Registrar entrega presencial", exact: true }),
  ).toHaveCount(0);
  assert.equal((await cashContext.request.get(base + "/api/cashier/refunds/21")).status(), 403);
  assert.equal(
    (
      await cashContext.request.post(base + "/api/cashier/refunds/20", {
        headers: { Origin: base },
        data: { invoiceId: 20 },
      })
    ).status(),
    409,
  );
  await cashContext.close();
  const unassigned = await browser.newContext();
  await unassigned.addCookies([{ name: "access_token", value: "refund-unassigned", url: base }]);
  const noBranch = await unassigned.newPage();
  await noBranch.goto(base + "/cashier/refunds");
  await expect(
    noBranch.getByRole("alert").filter({ hasText: "Contacta al administrador" }),
  ).toBeVisible();
  await expect(noBranch.getByRole("button", { name: "Buscar factura", exact: true })).toHaveCount(
    0,
  );
  await unassigned.close();
  assert.equal(attempts, 5);
  assert.equal(writes, 4);
  process.stdout.write(
    "PASS: devoluciones de cliente y cajero, sucursal fija, comprador sin cuenta, billetera, entrega presencial, doble clic, resultado incierto sin reenvío, permisos, saldo insuficiente y móvil.\n",
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

// Creates one identifiable, unpaid test quote through the real frontend.
// Credentials are read from stdin and never saved or printed.
import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import { chromium } from "@playwright/test";

if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = createInterface({ input: process.stdin, terminal: false });
process.stdout.write("READY: supply customer credentials as one JSON line on stdin.\n");
const identity = JSON.parse(await new Promise((resolve) => input.once("line", resolve)));
input.close();
const base = process.env.LIVE_FRONTEND_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
let submitted = false;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(identity.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(identity.password);
  const login = page.waitForResponse(
    (r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  assert.equal((await login).status(), 200);
  await page.waitForTimeout(500);
  assert.ok((await context.cookies()).some((cookie) => cookie.name === "access_token"));

  const contextResponse = await context.request.get(`${base}/api/rentals/context`);
  assert.equal(contextResponse.status(), 200, "Rental catalog unavailable");
  const catalog = await contextResponse.json();
  assert.ok(catalog.busTypes.length, "No rental bus type available for a test quote");
  const typeId = catalog.busTypes[0].id;
  await page.goto(`${base}/customer/rentals`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Solicitar cotización", exact: true }).click();
  await page.getByLabel("Origen", { exact: true }).fill("Prueba local - origen");
  await page.getByLabel("Destino", { exact: true }).fill("Prueba local - destino");
  const future = new Date(Date.now() + 14 * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(future);
  const part = (name) => parts.find((value) => value.type === name)?.value;
  const date = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  await page.getByLabel("Salida de ida (Guatemala)").fill(date);
  await page.getByLabel("Pasajeros", { exact: true }).fill("1");
  await page.getByLabel("Tipo de bus", { exact: true }).selectOption(String(typeId));
  await page.getByRole("checkbox", { name: "Confirmo que los datos son correctos." }).check();
  const result = page.waitForResponse(
    (r) => r.url().endsWith("/api/rentals/quotes") && r.request().method() === "POST",
  );
  submitted = true;
  await page.getByRole("button", { name: "Enviar solicitud de cotización", exact: true }).click();
  const response = await result;
  assert.equal(response.status(), 201, `Quote not confirmed: HTTP ${response.status()}`);
  const quote = await response.json();
  assert.equal(quote.status, "PENDING_APPROVAL");
  assert.ok(Number.isSafeInteger(quote.quoteId));
  assert.equal(typeof quote.quoteReference, "string");
  const listing = await context.request.get(`${base}/api/rentals/quotes`);
  assert.equal(listing.status(), 200, "Quote history unavailable");
  assert.ok(
    (await listing.json()).some((item) => item.quoteId === quote.quoteId),
    "Created quote missing from history",
  );
  process.stdout.write(
    `PASS: unpaid test quote #${quote.quoteId} is pending approval and appears in the customer's history.\n`,
  );
  await context.close();
} catch (error) {
  process.stderr.write(
    `${submitted ? "INCONCLUSIVE AFTER SUBMISSION: inspect quote history before any retry." : "No quote was submitted."} ${String(error?.message ?? "Unexpected error").split("\n")[0]}\n`,
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}

// One real Q0.01 recharge to a user-provided test account, then an idempotent
// replay. Credentials are read from stdin and never printed or saved.
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
let sent = false;
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
  assert.equal((await login).status(), 200, "Login rejected");
  await page.waitForTimeout(500);
  assert.ok(
    (await context.cookies()).some((cookie) => cookie.name === "access_token"),
    "Login not completed",
  );

  const beforeResponse = await context.request.get(`${base}/api/commerce/wallet`);
  assert.equal(beforeResponse.status(), 200, "Wallet unavailable");
  const before = await beforeResponse.json();
  assert.equal(before.wallet.active, true, "Wallet inactive");
  await page.goto(`${base}/customer/wallet`, { waitUntil: "networkidle" });
  await page.getByLabel("Monto de la recarga (Q)", { exact: true }).fill("0.01");
  const paymentDate = await page.getByLabel("Fecha de la recarga", { exact: true }).inputValue();
  assert.match(paymentDate, /^\d{4}-\d{2}-\d{2}$/);
  await page.getByRole("checkbox", { name: "Confirmo que los datos son correctos." }).check();
  const completion = page.waitForResponse(
    (r) => r.url().endsWith("/api/commerce/wallet/recharges") && r.request().method() === "POST",
  );
  sent = true;
  await page.getByRole("button", { name: "Confirmar recarga", exact: true }).click();
  const response = await completion;
  assert.equal(response.status(), 201, `Recharge not confirmed: HTTP ${response.status()}`);
  const key = response.request().headers()["idempotency-key"];
  const data = response.request().postDataJSON();
  assert.ok(key, "Missing idempotency key");
  assert.deepEqual(data, { amount: 0.01, paymentDate });
  const result = await response.json();
  assert.ok(Number.isSafeInteger(result.transactionId));
  const cents = (value) => Math.round(value * 100);
  assert.equal(
    cents(result.balanceAfter),
    cents(before.wallet.balance) + 1,
    "Incorrect credited balance",
  );

  const replay = await context.request.post(`${base}/api/commerce/wallet/recharges`, {
    headers: { Origin: base, "Idempotency-Key": key },
    data,
  });
  assert.equal(replay.status(), 201, `Idempotent replay rejected: HTTP ${replay.status()}`);
  const repeated = await replay.json();
  assert.equal(repeated.transactionId, result.transactionId, "Replay created another transaction");
  assert.equal(
    cents(repeated.balanceAfter),
    cents(result.balanceAfter),
    "Replay changed the balance",
  );
  const after = await (await context.request.get(`${base}/api/commerce/wallet`)).json();
  assert.equal(
    cents(after.wallet.balance),
    cents(result.balanceAfter),
    "Wallet balance differs from confirmed result",
  );
  assert.equal(
    after.transactions.filter((item) => item.id === result.transactionId).length,
    1,
    "Transaction missing or duplicated",
  );
  process.stdout.write(
    "PASS: Q0.01 credited once, same-key replay returned the same transaction, and wallet history confirms one movement.\n",
  );
  await context.close();
} catch (error) {
  process.stderr.write(
    `${sent ? "INCONCLUSIVE AFTER SUBMISSION: check wallet history before any retry." : "No recharge was submitted."} ${String(error?.message ?? "Unexpected error").split("\n")[0]}\n`,
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}

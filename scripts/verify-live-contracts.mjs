// Read-only verification of the updated contracts. Credentials enter on stdin;
// names, refund codes, passwords and access tokens are never output or stored.
import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import { chromium } from "@playwright/test";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = createInterface({ input: process.stdin, terminal: false });
process.stdout.write("READY: supply test role credentials on stdin.\n");
const credentials = JSON.parse(await new Promise((resolve) => input.once("line", resolve)));
input.close();
const base = process.env.LIVE_FRONTEND_URL ?? "http://localhost:3000";
const gateway = process.env.LIVE_GATEWAY_URL ?? "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true });
let failed = false;
let customerRefund;
try {
  for (const [role, identity] of Object.entries(credentials)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    let stage = "login";
    try {
      await page.goto(`${base}/login`);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Correo electrónico").fill(identity.email);
      await page.getByLabel("Contraseña", { exact: true }).fill(identity.password);
      const login = page.waitForResponse(
        (r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
      assert.equal((await login).status(), 200);
      const token = (await context.cookies()).find(
        (cookie) => cookie.name === "access_token",
      )?.value;
      assert.ok(token);
      const headers = { Authorization: `Bearer ${token}` };
      if (role === "CUSTOMER") {
        stage = "customer-refund-history";
        const refunds = await context.request.get(`${base}/api/commerce/refunds/mine`);
        assert.equal(refunds.status(), 200);
        const records = await refunds.json();
        customerRefund = records.find((refund) => refund.status === "PENDING") ?? records[0];
        process.stdout.write(JSON.stringify({ role, check: stage, result: "passed", hasTestRefund: !!customerRefund }) + "\n");
      }
      if (role === "ADMIN") {
        stage = "rental-policy";
        const direct = await context.request.get(`${gateway}/api/v1/rental-quote-policy`, {
          headers,
        });
        const frontend = await context.request.get(`${base}/api/rentals/policy`);
        assert.equal(direct.status(), 200);
        assert.equal(frontend.status(), 200);
        const source = await direct.json();
        assert.deepEqual(await frontend.json(), {
          validityDays: source.validityDays,
          waitCostPerHour: source.waitCostPerHour,
        });
        await page.goto(`${base}/system-admin/rentals`);
        await page.getByText("Política global de cotizaciones", { exact: true }).click();
        await page.getByLabel("Días de vigencia").waitFor();
        assert.equal(
          await page.getByLabel("Días de vigencia").inputValue(),
          String(source.validityDays),
        );
        process.stdout.write(JSON.stringify({ role, check: stage, result: "passed" }) + "\n");
      }
      if (role === "CASHIER") {
        stage = "cancellation-preview";
        const profile = await context.request.get(`${gateway}/api/v1/users/profile`, { headers });
        assert.equal(profile.status(), 200);
        const { branchIds } = await profile.json();
        assert.equal(branchIds.length, 1);
        const branchId = branchIds[0];
        const scoped = { ...headers, "X-Operation-Branch-Id": String(branchId) };
        const invoiceId = Number(process.env.LIVE_INVOICE_ID ?? 3);
        assert.ok(Number.isSafeInteger(invoiceId) && invoiceId > 0);
        const direct = await context.request.get(
          `${gateway}/api/v1/payments/${invoiceId}/tickets`,
          { headers: scoped },
        );
        const frontend = await context.request.get(`${base}/api/commerce/invoices/${invoiceId}`);
        assert.equal(direct.status(), 200);
        assert.equal(frontend.status(), 200);
        const source = await direct.json();
        const receipt = await frontend.json();
        assert.ok(source.tickets.length);
        for (const ticket of source.tickets) {
          assert.ok(ticket.cancellationPreview);
          assert.deepEqual(
            receipt.tickets.find((item) => item.ticketId === ticket.ticketId)?.cancellationPreview,
            ticket.cancellationPreview,
          );
        }
        process.stdout.write(
          JSON.stringify({
            role,
            check: stage,
            result: "passed",
            ticketsChecked: source.tickets.length,
          }) + "\n",
        );
        stage = "refund-claim";
        const refunds = await context.request.get(
          `${gateway}/api/v1/refunds/branches/${branchId}`,
          { headers: scoped },
        );
        assert.equal(refunds.status(), 200);
        const candidate = (await refunds.json()).find((refund) => refund.status === "PENDING") ?? customerRefund;
        if (!candidate) {
          process.stdout.write(
            JSON.stringify({ role, check: stage, result: "no pending refund in test scope" }) +
              "\n",
          );
          continue;
        }
        const query = new URLSearchParams({ code: candidate.refundCode });
        const original = await context.request.get(`${gateway}/api/v1/refunds/claim?${query}`, {
          headers: scoped,
        });
        const local = await context.request.get(`${base}/api/commerce/refunds/claim?${query}`);
        assert.equal(original.status(), 200);
        assert.equal(local.status(), 200);
        const upstream = await original.json();
        const claim = await local.json();
        for (const field of [
          "holderName",
          "tripId",
          "seatRow",
          "seatColumn",
          "operationBranchId",
          "cashSettleable",
          "requiredChecks",
        ])
          assert.deepEqual(claim[field], upstream[field]);
        assert.equal(claim.operationBranchId, branchId);
        assert.ok(!("email" in claim) && !("nit" in claim) && !("invoiceId" in claim));
        const detail = await context.request.get(
          `${base}/api/commerce/refunds/${claim.refundId}?${query}`,
        );
        assert.equal(detail.status(), 200);
        const partial = await context.request.get(
          `${base}/api/commerce/refunds/claim?${new URLSearchParams({ code: candidate.refundCode.slice(0, -1) })}`,
        );
        assert.equal(partial.status(), 404);
        await page.goto(`${base}/cashier/refunds`);
        await page.getByLabel("Código exacto del comprobante").fill(candidate.refundCode);
        await page.getByRole("button", { name: "Consultar devolución", exact: true }).click();
        await page.getByText(claim.holderName, { exact: true }).waitFor();
        if (claim.cashSettleable) {
          await page.getByLabel("Verifiqué que se presentó el comprobante con este código").waitFor();
          await page.getByLabel("Verifiqué presencialmente la identidad del titular").waitFor();
        }
        assert.equal(
          await page.getByRole("button", { name: "Registrar pago en efectivo" }).count(),
          0,
        );
        process.stdout.write(
          JSON.stringify({ role, check: stage, result: "passed", paymentSubmitted: false }) + "\n",
        );
      }
    } catch {
      failed = true;
      process.stdout.write(JSON.stringify({ role, check: stage, result: "failed" }) + "\n");
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;

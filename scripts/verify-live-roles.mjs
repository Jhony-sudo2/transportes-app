// Read-only checks against the running frontend and Gateway. Credentials are
// supplied once on stdin as JSON and are never written to disk or output.
import { createInterface } from "node:readline";
import { chromium } from "@playwright/test";

if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = createInterface({ input: process.stdin, terminal: false });
process.stdout.write("READY: supply role credentials as one JSON line on stdin.\n");
const credentials = JSON.parse(await new Promise((resolve) => input.once("line", resolve)));
input.close();
const base = process.env.LIVE_FRONTEND_URL ?? "http://localhost:3000";
const gateway = process.env.LIVE_GATEWAY_URL ?? "http://127.0.0.1:8080";
const rolePages = {
  CUSTOMER: [
    "/customer/wallet",
    "/customer/purchases",
    "/customer/refunds",
    "/customer/rentals",
    "/trips",
    "/mi-cuenta",
    "/mi-cuenta/contrasena",
  ],
  CASHIER: [
    "/cashier/pos",
    "/cashier/rentals",
    "/cashier/cash",
    "/cashier/refunds",
    "/cashier/seat-restrictions",
    "/mi-cuenta",
  ],
  DRIVER: ["/driver/trips", "/driver/license", "/mi-cuenta"],
  ADMIN: [
    "/system-admin/users",
    "/system-admin/users/new",
    "/system-admin/branches",
    "/system-admin/bus-types",
    "/system-admin/expense-categories",
    "/system-admin/cancellation-policy",
    "/system-admin/rentals",
    "/system-admin/reports",
    "/mi-cuenta",
  ],
  SUCURSAL_ADMIN: [
    "/branch-admin/buses",
    "/branch-admin/buses/new",
    "/branch-admin/drivers",
    "/branch-admin/drivers/new",
    "/branch-admin/drivers/requests",
    "/branch-admin/cashiers/new",
    "/branch-admin/trips",
    "/branch-admin/routes",
    "/branch-admin/maintenance",
    "/branch-admin/reports",
    "/branch-admin/rentals",
    "/branch-admin/seat-restrictions",
    "/branch-admin/pos",
    "/branch-admin/cash",
    "/mi-cuenta",
  ],
};
const comparisons = {
  CUSTOMER: [
    ["/api/commerce/wallet", ["wallets/me", "wallets/me/transactions"]],
    ["/api/commerce/invoices/mine", ["payments/me"]],
    ["/api/commerce/refunds/mine", ["refunds/me"]],
    ["/api/rentals/quotes", ["rental-quotes/me"]],
  ],
  CASHIER: [
    ["/api/commerce/context", []],
    ["/api/commerce/cash", ["cash/branches/1"]],
    ["/api/rentals/quotes", []],
  ],
  DRIVER: [["/api/account/profile", ["users/profile", "drivers/me"]]],
  ADMIN: [
    ["/api/admin/users", []],
    ["/api/admin/branches", []],
    ["/api/admin/bus-types", []],
    ["/api/rentals/quotes", ["rental-quotes/admin"]],
    ["/api/rentals/policy", ["rental-quote-policy"]],
  ],
  SUCURSAL_ADMIN: [
    [
      "/api/branch-admin/journey-context",
      [
        "branches",
        "branches/catalog",
        "branches/1",
        "branches/2",
        "bus-types",
        "expense-categories",
      ],
    ],
    ["/api/analytics/context", []],
    ["/api/analytics/fleet-operations", []],
    ["/api/analytics/branch-operations", []],
    ["/api/branch-admin/route-branches", []],
    ["/api/maintenance/services", []],
    ["/api/maintenance/categories", []],
    ["/api/branch-admin/trips", []],
    ["/api/rentals/operating-trips", []],
    ["/api/branch-admin/context", []],
    ["/api/branch-admin/buses", []],
    ["/api/branch-admin/drivers", []],
    ["/api/rentals/quotes", ["rental-quotes/admin"]],
  ],
};
function safeText(value) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[dato oculto]")
    .slice(0, 280);
}
function shape(value) {
  if (Array.isArray(value)) return value.length ? `[${shape(value[0])}]` : "[]";
  if (value === null) return "null";
  if (typeof value !== "object") return typeof value;
  return `{${Object.keys(value).sort().join(",")}}`;
}
async function summarize(response) {
  const body = await response.json().catch(() => null);
  return {
    status: response.status(),
    shape: shape(body),
    code: typeof body?.code === "string" ? safeText(body.code) : undefined,
  };
}
const browser = await chromium.launch({ headless: true });
try {
  const publicOffers = await fetch(`${gateway}/api/v1/trips`)
    .then((r) => r.json())
    .catch(() => []);
  for (const [role, identity] of Object.entries(credentials)) {
    if (!rolePages[role] || !identity?.email || !identity?.password) continue;
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    let stage = "open login";
    try {
      await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      stage = "fill login";
      await page.getByLabel("Correo electrónico").fill(identity.email);
      await page.getByLabel("Contraseña", { exact: true }).fill(identity.password);
      const received = page.waitForResponse(
        (r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
      );
      stage = "submit login";
      await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
      const login = await received;
      const payload = await login.json().catch(() => ({}));
      if (login.status() === 200) await page.waitForTimeout(500);
      const authCookie = (await context.cookies()).find((cookie) => cookie.name === "access_token");
      if (login.status() !== 200 || !authCookie) {
        process.stdout.write(
          JSON.stringify({
            role,
            login: login.status(),
            state: safeText(payload.status ?? payload.code ?? "unconfirmed"),
          }) + "\n",
        );
        continue;
      }
      const token = authCookie.value;
      if (!token) throw new Error("Authenticated response without access cookie");
      process.stdout.write(
        JSON.stringify({
          role,
          login: "authenticated",
          cookieHttpOnly:
            (await context.cookies()).find((c) => c.name === "access_token")?.httpOnly === true,
        }) + "\n",
      );
      let selectedBranchId;
      if (role === "SUCURSAL_ADMIN") {
        await page.goto(`${base}/branch-admin`, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        const selector = page.locator("#managed-branch");
        const options = await selector
          .locator("option")
          .evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
        if (!options.length) {
          process.stdout.write(
            JSON.stringify({ role, branch: "no assigned branches available" }) + "\n",
          );
        } else {
          const selected = await selector.inputValue();
          if (!selected) {
            const response = page.waitForResponse(
              (r) =>
                r.url().endsWith("/api/branch-admin/context") && r.request().method() === "PUT",
            );
            await selector.selectOption(options[0]);
            const selection = await response;
            if (!selection.ok()) throw new Error(`Branch selection failed: ${selection.status()}`);
            await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
          }
          selectedBranchId = await selector.inputValue();
          process.stdout.write(
            JSON.stringify({ role, branch: "selected", availableCount: options.length }) + "\n",
          );
        }
      }
      stage = "compare endpoints";
      for (const [frontend, providers] of comparisons[role] ?? []) {
        const branchParam =
          selectedBranchId && frontend !== "/api/branch-admin/context"
            ? `?branchId=${selectedBranchId}`
            : "";
        const local = await context.request.get(`${base}${frontend}${branchParam}`);
        const direct = [];
        for (const provider of providers) {
          const response = await context.request.get(`${gateway}/api/v1/${provider}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              ...(selectedBranchId ? { "X-Operation-Branch-Id": selectedBranchId } : {}),
            },
          });
          direct.push({ path: provider, ...(await summarize(response)) });
        }
        process.stdout.write(
          JSON.stringify({
            role,
            endpoint: frontend,
            frontend: await summarize(local),
            providers: direct,
          }) + "\n",
        );
      }
      const tripId = Array.isArray(publicOffers) ? publicOffers[0]?.tripId : null;
      const pages = [
        ...(process.env.LIVE_CHECK_ENDPOINTS_ONLY ? [] : rolePages[role]),
        ...(role === "CUSTOMER" && Number.isSafeInteger(tripId)
          ? [`/customer/trips/${tripId}`]
          : []),
      ];
      for (const path of pages) {
        const failures = [];
        const listener = (response) => {
          const url = new URL(response.url());
          if (
            url.origin === new URL(base).origin &&
            url.pathname.startsWith("/api/") &&
            response.status() >= 400
          )
            failures.push({ path: url.pathname, status: response.status() });
        };
        page.on("response", listener);
        try {
          const result = await page.goto(`${base}${path}`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
          const alerts = (await page.locator("main [role=alert]").allTextContents())
            .map(safeText)
            .filter(Boolean);
          const finalPath = new URL(page.url()).pathname;
          process.stdout.write(
            JSON.stringify({
              role,
              page: path,
              http: result?.status(),
              finalPath,
              apiFailures: failures,
              alerts,
            }) + "\n",
          );
        } catch {
          process.stdout.write(
            JSON.stringify({
              role,
              page: path,
              error: "Navigation did not complete",
              apiFailures: failures,
            }) + "\n",
          );
        } finally {
          page.off("response", listener);
        }
      }
    } catch (error) {
      const alerts = await page
        .locator("main [role=alert], main [role=status]")
        .allTextContents()
        .catch(() => []);
      process.stdout.write(
        JSON.stringify({
          role,
          stage,
          error: safeText(error?.message?.split("\n")[0] ?? "Unexpected error"),
          alerts: alerts.map(safeText).filter(Boolean),
        }) + "\n",
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

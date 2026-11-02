import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3280,
  apiPort = 3281;
const base = `http://localhost:${appPort}`,
  temporaryConfig = ".next-administration-check.tsconfig.json";
const admin = {
  id: 1,
  name: "Ana",
  lastName: "Admin",
  email: "admin@example.com",
  role: { id: 1, name: "ADMIN" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: false,
  branchIds: [2],
};
const types = [
  {
    id: 1,
    name: "Regular",
    description: "",
    capacity: 48,
    fuelEstimatePerKm: 2,
    depreciationPerKm: 0.2,
    suggestedDriverSalaryPerTrip: 100,
    active: true,
  },
];
const branch = {
  id: 2,
  name: "Central",
  active: false,
  phone: "55555555",
  latitude: 14.6,
  longitude: -90.5,
};
let typeWrites = 0,
  branchWrites = 0,
  hasResponsible = false;
const failures = [];
const api = http.createServer(async (request, response) => {
  const send = (body, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  try {
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    if (!["admin", "branch", "customer"].includes(token)) return send({}, 401);
    if (request.url === "/api/v1/users/profile")
      return send({
        ...admin,
        role:
          token === "admin"
            ? admin.role
            : {
                id: token === "branch" ? 3 : 2,
                name: token === "branch" ? "SUCURSAL_ADMIN" : "CUSTOMER",
              },
      });
    if (request.url === "/api/v1/bus-types" && request.method === "GET") return send(types);
    if (token !== "admin") return send({}, 403);
    if (request.url === "/api/v1/branches") return send([branch]);
    if (request.url === "/api/v1/branches/2" && request.method === "GET") return send(branch);
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const data = raw ? JSON.parse(raw) : null;
    if (request.url === "/api/v1/bus-types" && request.method === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const item = { id: types.length + 1, ...data };
      types.push(item);
      typeWrites++;
      return send(item, 201);
    }
    if (/^\/api\/v1\/bus-types\/\d+$/.test(request.url) && request.method === "PATCH") {
      const item = types.find((type) => type.id === Number(request.url.split("/").at(-1)));
      if (!item) return send({}, 404);
      if (item.id === 1 && data.capacity !== 48)
        return send({ detail: "El tipo tiene buses asociados", code: "TYPE_CAPACITY_IN_USE" }, 409);
      Object.assign(item, data);
      typeWrites++;
      return send(item);
    }
    if (request.url === "/api/v1/branches/2" && request.method === "PATCH") {
      assert.deepEqual(Object.keys(data), ["active"]);
      if (data.active && !hasResponsible)
        return send(
          { detail: "La sucursal requiere un administrador activo", code: "BRANCH_ADMIN_REQUIRED" },
          409,
        );
      branch.active = data.active;
      branchWrites++;
      return send(branch);
    }
    return send({}, 404);
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
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe configuración temporal de identidad.");
  fs.writeFileSync(temporaryConfig, fs.readFileSync("tsconfig.json"));
  ownsConfig = true;
  process.env.GATEWAY_URL = `http://${host}:${apiPort}`;
  await new Promise((resolve, reject) => {
    api.once("error", reject);
    api.listen(apiPort, host, resolve);
  });
  const next = (await import("next")).default;
  const config = await require("next/dist/server/config").default(
    require("next/constants").PHASE_DEVELOPMENT_SERVER,
    process.cwd(),
  );
  config.distDir = ".next-administration-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: config.distDir, typescript: { tsconfigPath: temporaryConfig } },
  });
  await app.prepare();
  web = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(appPort, host, resolve);
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "access_token", value: "admin", url: base }]);
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(String(error)));
  await page.route("**/*.tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4c8AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto(base + "/system-admin/bus-types");
  await expect(page.getByRole("button", { name: "Editar Regular", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Crear tipo de bus", exact: true }).click();
  for (const [label, value] of [
    ["Nombre del tipo", "Ejecutivo"],
    ["Capacidad del tipo", "40"],
    ["Combustible estimado por km (Q)", "2.1234"],
    ["Depreciación por km (Q)", "0.1234"],
    ["Salario sugerido por tramo (Q)", "150.50"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Guardar tipo de bus", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("status").filter({ hasText: "Tipo de bus Ejecutivo guardado." }),
  ).toBeVisible();
  assert.equal(typeWrites, 1);
  await page.reload();
  await page.getByRole("button", { name: "Editar Regular", exact: true }).click();
  await page.getByLabel("Capacidad del tipo", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Guardar tipo de bus", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "buses asociados" })).toBeVisible();
  assert.equal(typeWrites, 1);
  await page.getByRole("button", { name: "Cerrar formulario", exact: true }).click();
  await page.getByRole("button", { name: "Editar Ejecutivo", exact: true }).click();
  await page.getByLabel("Combustible estimado por km (Q)", { exact: true }).fill("0");
  await page.getByLabel("Tipo activo", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Guardar tipo de bus", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tipo de bus Ejecutivo guardado." }),
  ).toBeVisible();
  assert.equal(typeWrites, 2);
  assert.equal(types[1].active, false);
  assert.equal(types[1].fuelEstimatePerKm, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/bus-types-mobile.png", fullPage: true });
  await page.goto(base + "/system-admin/branches");
  await page.getByRole("button", { name: "Habilitar sucursal Central", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Habilitar sucursal", exact: true });
  await dialog.getByRole("button", { name: "Confirmar estado", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("administrador activo");
  assert.equal(branchWrites, 0);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  hasResponsible = true;
  await page.getByRole("button", { name: "Habilitar sucursal Central", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmar estado", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Deshabilitar sucursal Central", exact: true }),
  ).toBeVisible();
  assert.equal(branchWrites, 1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Deshabilitar sucursal Central", exact: true }),
  ).toBeVisible();
  await context.close();
  const branchContext = await browser.newContext();
  await branchContext.addCookies([{ name: "access_token", value: "branch", url: base }]);
  assert.equal(
    (await branchContext.request.get(base + "/api/branch-admin/bus-types")).status(),
    200,
  );
  assert.equal(
    (
      await branchContext.request.post(base + "/api/admin/bus-types", {
        headers: { Origin: base },
        data: types[0],
      })
    ).status(),
    403,
  );
  await branchContext.close();
  assert.deepEqual(failures, []);
  process.stdout.write(
    "PASS SOLO_CONTRATO: tipos de bus, tarifas, capacidad en uso, doble clic, habilitación de sucursal con responsable, permisos, persistencia y móvil.\n",
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

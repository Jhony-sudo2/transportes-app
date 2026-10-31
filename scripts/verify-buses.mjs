import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3260,
  apiPort = 3261;
const base = `http://localhost:${appPort}`,
  apiBase = `http://${host}:${apiPort}`;
const temporaryConfig = ".next-buses-check.tsconfig.json";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=",
  "base64",
);
const user = {
  id: 3,
  name: "Ana",
  lastName: "Administrador",
  email: "branch@example.com",
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: false,
  branchIds: [1, 2],
};
const buses = [
  {
    id: 4,
    plateNumber: "C123ABC",
    brand: "Marca",
    model: "2025",
    yearManufacture: 2024,
    capacity: 48,
    currentKm: 100,
    seatRows: 12,
    seatColumns: 4,
    state: "AVAILABLE",
    photo: `${apiBase}/photos/old.png`,
  },
  {
    id: 5,
    plateNumber: "C999BBB",
    brand: "Anterior",
    model: "2020",
    yearManufacture: 2019,
    capacity: 24,
    currentKm: 0,
    seatRows: 6,
    seatColumns: 4,
    state: "OUT_OF_SERVICE",
    photo: null,
  },
];
let createAttempts = 0,
  createWrites = 0,
  updateAttempts = 0,
  updateWrites = 0;
let uncertainUpdate = false,
  rejectUpdate = false;
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  if (request.url.startsWith("/photos/")) {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(png);
    return;
  }
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  if (!["bus-admin", "bus-customer"].includes(token)) return send({}, 401);
  if (request.url === "/api/v1/users/profile")
    return send(token === "bus-admin" ? user : { ...user, role: { id: 2, name: "CUSTOMER" } });
  if (token !== "bus-admin") return send({}, 403);
  if (request.url === "/api/v1/branches/1") return send({ id: 1, name: "Norte" });
  if (request.url === "/api/v1/branches/2") return send({ id: 2, name: "Central" });
  if (request.url === "/api/v1/branches/2/buses") return send(buses);
  if (request.url === "/api/v1/branches/1/buses") return send([]);
  if (
    (request.url === "/api/v1/buses" && request.method === "POST") ||
    (/^\/api\/v1\/buses\/\d+$/.test(request.url) && request.method === "PUT")
  ) {
    const create = request.method === "POST";
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers["content-type"] },
    }).formData();
    const part = create ? "request" : "data";
    assert.equal(form.get(part).type, "application/json");
    assert.equal(form.has(create ? "data" : "request"), false);
    const data = JSON.parse(await form.get(part).text());
    assert.equal("currentKm" in data, create);
    assert.equal("branchId" in data, create);
    if (create) {
      createAttempts++;
      assert.equal(data.branchId, 2);
      assert.equal(data.capacity, data.seatRows * data.seatColumns);
      assert.ok(form.get("photo").size > 0);
    } else updateAttempts++;
    if (!create && rejectUpdate) return send({ detail: "El bus tiene viajes pendientes" }, 409);
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (create) {
      const created = {
        id: 6,
        plateNumber: data.plateNumber,
        brand: data.brand,
        model: String(data.model),
        yearManufacture: data.year_manufacture,
        capacity: data.capacity,
        currentKm: data.currentKm,
        seatRows: data.seatRows,
        seatColumns: data.seatColumns,
        state: "AVAILABLE",
        photo: `${apiBase}/photos/created.png`,
      };
      buses.push(created);
      createWrites++;
      return send(created, 201);
    }
    const bus = buses.find((bus) => bus.id === Number(request.url.split("/").at(-1)));
    if (!bus) return send({}, 404);
    // BusResponse todavía no expone color; la edición debe pedirlo de nuevo.
    for (const field of ["brand", "yearManufacture", "capacity", "seatRows", "seatColumns"])
      bus[field] = data[field];
    bus.plateNumber = data.plateNumber.toUpperCase();
    bus.model = String(data.model);
    if (form.get("photo")) {
      assert.equal(form.get("photo").type, "image/png");
      bus.photo = `${apiBase}/photos/replaced.png`;
    }
    updateWrites++;
    if (uncertainUpdate) return send({}, 503);
    return send(bus);
  }
  return send({}, 404);
});
let app,
  web,
  browser,
  ownsConfig = false;
try {
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe la configuración temporal de buses.");
  fs.writeFileSync(temporaryConfig, fs.readFileSync("tsconfig.json"));
  ownsConfig = true;
  process.env.GATEWAY_URL = apiBase;
  await new Promise((resolve, reject) => {
    api.once("error", reject);
    api.listen(apiPort, host, resolve);
  });
  const next = (await import("next")).default;
  const config = await require("next/dist/server/config").default(
    require("next/constants").PHASE_DEVELOPMENT_SERVER,
    process.cwd(),
  );
  config.distDir = ".next-buses-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-buses-check", typescript: { tsconfigPath: temporaryConfig } },
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
  const anonPage = await anonymous.newPage();
  await anonPage.goto(base + "/branch-admin/buses");
  await expect(anonPage).toHaveURL(base + "/login");
  assert.equal(
    (await anonymous.request.get(base + "/api/branch-admin/buses?branchId=2")).status(),
    401,
  );
  await anonymous.close();
  const restricted = await browser.newContext();
  await restricted.addCookies([{ name: "access_token", value: "bus-customer", url: base }]);
  assert.equal((await restricted.request.get(base + "/branch-admin/buses")).status(), 404);
  assert.equal(
    (await restricted.request.get(base + "/api/branch-admin/buses?branchId=2")).status(),
    403,
  );
  await restricted.close();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([
    { name: "access_token", value: "bus-admin", url: base },
    { name: "managed_branch_id", value: "2", url: base },
  ]);
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource"))
      runtimeErrors.push(message.text());
  });
  await page.goto(base + "/branch-admin/buses");
  await expect(page.getByRole("img", { name: "Bus con placa C123ABC", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "C999BBB" })).toContainText("Sin imagen");
  await page.getByRole("button", { name: "Editar bus C123ABC", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bus C123ABC", exact: true });
  await expect(dialog.getByLabel("Marca", { exact: true })).toHaveValue("Marca");
  await expect(dialog.getByLabel("Color", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Kilometraje inicial", { exact: true })).toHaveCount(0);
  await dialog.getByLabel("Color", { exact: true }).fill("Azul");
  await dialog.getByLabel("Marca", { exact: true }).fill("Actualizada");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(dialog.getByRole("button", { name: "Guardando…", exact: true })).toBeDisabled();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "actualizado" })).toBeVisible();
  assert.equal(updateAttempts, 1);
  assert.equal(updateWrites, 1);
  assert.equal(buses[0].photo, `${apiBase}/photos/old.png`);
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "C123ABC" })).toContainText("Actualizada");
  await page.getByRole("button", { name: "Editar bus C123ABC", exact: true }).click();
  await dialog.getByLabel("Color", { exact: true }).fill("Azul");
  const file = { name: "bus.png", mimeType: "image/png", buffer: png };
  await dialog
    .getByLabel("Nueva fotografía del bus (opcional)", { exact: true })
    .setInputFiles(file);
  await expect(
    dialog.getByRole("img", { name: "Vista previa de la fotografía del bus", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Bus con placa C123ABC", exact: true }),
  ).toHaveAttribute("src", `${apiBase}/photos/replaced.png`);
  assert.equal(updateAttempts, 2);
  assert.equal(updateWrites, 2);
  await page.getByRole("button", { name: "Editar bus C123ABC", exact: true }).click();
  await dialog.getByLabel("Color", { exact: true }).fill("Azul");
  rejectUpdate = true;
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("El bus tiene viajes pendientes");
  assert.equal(updateWrites, 2);
  rejectUpdate = false;
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Editar bus C123ABC", exact: true }).click();
  await dialog.getByLabel("Color", { exact: true }).fill("Azul");
  await dialog.getByLabel("Marca", { exact: true }).fill("Confirmar listado");
  uncertainUpdate = true;
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(
    dialog.getByText("La operación podría haberse registrado.", { exact: false }),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Guardar cambios", exact: true })).toBeDisabled();
  assert.equal(updateAttempts, 4);
  assert.equal(updateWrites, 3);
  uncertainUpdate = false;
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "C123ABC" })).toContainText(
    "Confirmar listado",
  );
  await page.getByRole("link", { name: "Crear bus", exact: true }).click();
  await expect(page).toHaveURL(base + "/branch-admin/buses/new");
  for (const [label, value] of [
    ["Número de placa", "C456DEF"],
    ["Marca", "Nueva"],
    ["Color", "Blanco"],
    ["Modelo (año)", "2025"],
    ["Año de fabricación", "2024"],
    ["Kilometraje inicial", "20"],
    ["Filas de asientos", "10"],
    ["Columnas de asientos", "4"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Crear bus", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Selecciona una fotografía" }),
  ).toBeVisible();
  assert.equal(createAttempts, 0);
  await page
    .locator("#bus-photo")
    .setInputFiles({ name: "fake.png", mimeType: "text/plain", buffer: Buffer.from("texto") });
  await expect(page.getByRole("alert").filter({ hasText: "JPG o PNG" })).toBeVisible();
  await page.locator("#bus-photo").setInputFiles(file);
  await expect(
    page.getByRole("img", { name: "Vista previa de la fotografía del bus", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/bus-photo-create-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Crear bus", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("heading", { name: "Bus creado", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bus con placa C456DEF", exact: true })).toBeVisible();
  assert.equal(createAttempts, 1);
  assert.equal(createWrites, 1);
  await page.getByRole("link", { name: "Ver buses", exact: true }).click();
  await expect(page.getByRole("img", { name: "Bus con placa C456DEF", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar bus C456DEF", exact: true }).click();
  await page.screenshot({ path: "test-results/bus-edit-mobile.png", fullPage: true });
  assert.deepEqual(runtimeErrors, []);
  await context.close();
  process.stdout.write(
    "PASS: creación multipart con fotografía y vista previa, imagen en listado, edición con data sin foto y con reemplazo, estado persistente, sucursal y roles, doble clic, rechazo de negocio, resultado incierto sin reenvío y móvil.\n",
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

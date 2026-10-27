import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { chromium, expect } from "@playwright/test";
const host = "127.0.0.1",
  appPort = 3210,
  apiPort = 3211,
  temporaryConfig = ".next-map-check.tsconfig.json";
const base = `http://localhost:${appPort}`;
const profile = {
  id: 1,
  name: "Ana",
  lastName: "Administrador",
  email: "ana@example.com",
  role: { id: 1, name: "ADMIN" },
  isActive: true,
  twoFactorEnabled: false,
  resetPassword: false,
  branchIds: [],
  customerId: null,
};
let branches = [
  {
    id: 1,
    name: "Sede Central",
    phone: "55555555",
    latitude: 14.6349151,
    longitude: -90.5068821,
    municipalityId: 7,
    departamentId: 1,
    municipalityName: "Guatemala",
    departamentName: "Guatemala",
    indication: "Centro",
  },
];
let received = null,
  writeCount = 0,
  updateCount = 0,
  receivedUpdate = null;
let receivedBus = null,
  receivedDriver = null,
  receivedPhoto = null,
  busWrites = 0,
  driverWrites = 0,
  operationReads = 0;
let driverListReads = 0;
let busAvailabilityWrites = 0,
  driverAvailabilityWrites = 0,
  busAvailabilityAttempts = 0;
let failNextBusAvailability = false;
let licenseWrites = 0;
let salaryWrites = 0,
  deleteAttempts = 0,
  deleteWrites = 0,
  failNextDelete = true;
const storedBuses = Array.from({ length: 12 }, (_, i) => ({
  id: 100 + i,
  branchId: 1,
  plateNumber: "CENTRAL-" + (i + 1),
  brand: "Marca local",
  model: "2020",
  yearManufacture: 2019,
  currentKm: 0,
  capacity: 40,
  seatRows: 10,
  seatColumns: 4,
  state: i % 2 ? "OUT_OF_SERVICE" : "AVAILABLE",
}));
const storedDrivers = [
  {
    id: 32,
    branchId: 2,
    name: "Carlos",
    lastName: "Rechazado",
    email: "carlos@example.com",
    status: "ACCOUNT_REJECTED",
    pendingOperationId: null,
    failureReason: "Correo ya registrado",
  },
  {
    id: 33,
    branchId: 2,
    name: "Rosa",
    lastName: "Pendiente",
    email: "rosa@example.com",
    status: "PENDING",
    pendingOperationId: "550e8400-e29b-41d4-a716-446655440001",
    number: "LIC-P",
    licenseTypeName: "A",
  },
];
const driverOperationId = "550e8400-e29b-41d4-a716-446655440000";
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  if (!request.headers.authorization) {
    send({}, 401);
    return;
  }
  if (request.url === "/api/v1/users/profile") {
    if (request.headers.authorization.includes("branch-admin")) {
      send({
        ...profile,
        role: { id: 3, name: "SUCURSAL_ADMIN" },
        branchIds: request.headers.authorization.includes("empty")
          ? []
          : request.headers.authorization.includes("single")
            ? [1]
            : [1, 2],
      });
      return;
    }

    send(
      request.headers.authorization.includes("customer")
        ? { ...profile, role: { id: 2, name: "CUSTOMER" } }
        : profile,
    );
    return;
  }

  if (request.url === "/api/v1/roles") {
    send([
      { id: 1, name: "ADMIN" },
      { id: 2, name: "CUSTOMER" },
      { id: 3, name: "SUCURSAL_ADMIN" },
      { id: 4, name: "DRIVER" },
      { id: 5, name: "CASHIER" },
    ]);
    return;
  }
  const salaryPath = request.url.match(/^\/api\/v1\/drivers\/(\d+)\/salary$/);
  if (salaryPath && request.method === "PATCH") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const data = JSON.parse(raw);
    assert.deepEqual(Object.keys(data), ["baseSalary"]);
    const driver = storedDrivers.find((record) => record.id === Number(salaryPath[1]));
    assert.ok(driver);
    salaryWrites++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    driver.baseSalary = data.baseSalary;
    send(driver);
    return;
  }
  const deletePath = request.url.match(/^\/api\/v1\/drivers\/(\d+)$/);
  if (deletePath && request.method === "DELETE") {
    deleteAttempts++;
    if (failNextDelete) {
      failNextDelete = false;
      send({ detail: "Error temporal de eliminación" }, 503);
      return;
    }
    const index = storedDrivers.findIndex((record) => record.id === Number(deletePath[1]));
    assert.ok(index >= 0);
    assert.equal(storedDrivers[index].status, "ACCOUNT_REJECTED");
    await new Promise((resolve) => setTimeout(resolve, 400));
    storedDrivers.splice(index, 1);
    deleteWrites++;
    response.writeHead(204);
    response.end();
    return;
  }
  const availabilityPath = request.url.match(
    /^\/api\/v1\/(buses|drivers)\/(\d+)\/disponibilidad(?:\?active=(true|false))?$/,
  );
  if (availabilityPath && request.method === "PATCH") {
    const [, resource, rawId, queryActive] = availabilityPath;
    const id = Number(rawId);
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const active = resource === "buses" ? JSON.parse(raw).active : queryActive === "true";
    if (resource === "buses") {
      assert.deepEqual(Object.keys(JSON.parse(raw)), ["active"]);
      busAvailabilityAttempts++;
      if (failNextBusAvailability) {
        failNextBusAvailability = false;
        send({ detail: "Error temporal de flota" }, 503);
        return;
      }
      const bus = storedBuses.find((record) => record.id === id);
      assert.ok(bus);
      await new Promise((resolve) => setTimeout(resolve, 400));
      bus.state = active ? "AVAILABLE" : "OUT_OF_SERVICE";
      busAvailabilityWrites++;
      response.writeHead(204);
      response.end();
    } else {
      assert.equal(raw, "");
      const driver = storedDrivers.find((record) => record.id === id);
      assert.ok(driver);
      await new Promise((resolve) => setTimeout(resolve, 400));
      driver.status = active ? "ACTIVE" : "INACTIVE";
      driver.active = active;
      driverAvailabilityWrites++;
      send(driver);
    }
    return;
  }
  if (/^\/api\/v1\/buses\/\d+$/.test(request.url) && request.method === "GET") {
    const bus = storedBuses.find((record) => record.id === Number(request.url.split("/")[4]));
    send(bus ?? {}, bus ? 200 : 404);
    return;
  }
  if (request.url === "/api/v1/licenses/81") {
    const driver = storedDrivers.find((record) => record.licenseId === 81);
    assert.ok(driver);
    if (request.method === "PUT") {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const data = JSON.parse(raw);
      assert.deepEqual(Object.keys(data).sort(), ["expirationDate", "licenseType", "number"]);
      if (data.number === "LIC-DUPLICADA") {
        send({ detail: "Número de licencia ya registrado." }, 409);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      driver.number = data.number;
      driver.expirationDate = data.expirationDate;
      driver.licenseTypeId = data.licenseType;
      driver.licenseTypeName = data.licenseType === 1 ? "A" : "B";
      licenseWrites++;
    }
    send({
      id: 81,
      number: driver.number,
      expirationDate: driver.expirationDate,
      tipo: driver.licenseTypeName,
    });
    return;
  }
  if (request.url === "/api/v1/licenses/types") {
    send([
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ]);
    return;
  }
  if (request.url === "/api/v1/buses" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    receivedBus = JSON.parse(body);
    if (receivedBus.plateNumber === "EXISTENTE") {
      send({ detail: "Ya existe un bus con esa placa." }, 409);
      return;
    }
    busWrites++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    const bus = {
      id: 4,
      plateNumber: receivedBus.plateNumber,
      brand: receivedBus.brand,
      model: String(receivedBus.model),
      yearManufacture: receivedBus.year_manufacture,
      currentKm: receivedBus.currentKm,
      capacity: receivedBus.capacity,
      seatRows: receivedBus.seatRows,
      seatColumns: receivedBus.seatColumns,
      state: "AVAILABLE",
    };
    storedBuses.push({ ...bus, branchId: receivedBus.branchId });
    send(bus, 201);
    return;
  }
  if (request.url === "/api/v1/drivers" && request.method === "POST") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const multipart = await new Request("http://localhost/drivers", {
      method: "POST",
      headers: request.headers,
      body: Buffer.concat(chunks),
    }).formData();
    const requestPart = multipart.get("request"),
      photo = multipart.get("photo");
    receivedDriver = JSON.parse(await requestPart.text());
    receivedPhoto = { size: photo.size, type: photo.type, requestType: requestPart.type };
    storedDrivers.push({
      id: 31,
      branchId: receivedDriver.branchId,
      name: receivedDriver.name,
      lastName: receivedDriver.lastName,
      email: receivedDriver.email,
      phone: receivedDriver.phone,
      baseSalary: receivedDriver.baseSalary,
      licenseId: 81,
      licenseTypeId: receivedDriver.license.licenseType,
      number: receivedDriver.license.number,
      expirationDate: receivedDriver.license.expirationDate,
      licenseTypeName: "A",
      status: "PENDING",
      pendingOperationId: driverOperationId,
      active: false,
    });
    driverWrites++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    send(
      {
        id: 31,
        name: receivedDriver.name,
        lastName: receivedDriver.lastName,
        email: receivedDriver.email,
        status: "PENDING",
        pendingOperationId: driverOperationId,
      },
      202,
    );
    return;
  }
  if (/^\/api\/v1\/branches\/\d+\/buses$/.test(request.url)) {
    const branchId = Number(request.url.split("/")[4]);
    send(storedBuses.filter((bus) => bus.branchId === branchId));
    return;
  }
  if (/^\/api\/v1\/branches\/\d+\/drivers$/.test(request.url)) {
    const branchId = Number(request.url.split("/")[4]);
    driverListReads++;
    send(storedDrivers.filter((driver) => driver.branchId === branchId));
    return;
  }
  if (request.url === "/api/v1/drivers/31/operations/" + driverOperationId) {
    operationReads++;
    if (operationReads > 1) {
      const driver = storedDrivers.find((record) => record.id === 31);
      if (driver) {
        driver.status = "ACTIVE";
        driver.pendingOperationId = null;
        driver.active = true;
        driver.userId = 321;
      }
    }
    send({
      operationId: driverOperationId,
      driverId: 31,
      action: "CREATE",
      status: operationReads > 1 ? "COMPLETED" : "PENDING",
      failureReason: null,
    });
    return;
  }

  if (request.url === "/api/v1/directions/departments") {
    send([{ id: 1, name: "Guatemala" }]);
    return;
  }
  if (request.url === "/api/v1/directions/departments/1/municipalities") {
    send([{ id: 7, name: "Guatemala" }]);
    return;
  }
  if (request.url === "/api/v1/branches" && request.method === "GET") {
    send(branches);
    return;
  }
  if (/^\/api\/v1\/branches\/\d+$/.test(request.url)) {
    const id = Number(request.url.split("/").at(-1));
    const current = branches.find((branch) => branch.id === id);
    if (!current) {
      send({}, 404);
      return;
    }
    if (request.method === "GET") {
      send(current);
      return;
    }
    if (request.method === "PUT") {
      let body = "";
      for await (const chunk of request) body += chunk;
      receivedUpdate = JSON.parse(body);
      updateCount++;
      const updated = {
        ...current,
        name: receivedUpdate.name,
        phone: receivedUpdate.phone,
        latitude: receivedUpdate.direction.latitude,
        longitude: receivedUpdate.direction.longitude,
        indication: receivedUpdate.direction.indication,
        municipalityId: receivedUpdate.direction.municipalityId,
        departamentId: 1,
      };
      branches = branches.map((branch) => (branch.id === id ? updated : branch));
      send(updated);
      return;
    }
  }
  if (request.url === "/api/v1/branches" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    received = JSON.parse(body);
    writeCount++;
    const record = {
      id: 2,
      name: received.name,
      phone: received.phone,
      latitude: received.direction.latitude,
      longitude: received.direction.longitude,
      municipalityId: received.direction.municipalityId,
      departamentId: 1,
      municipalityName: "Guatemala",
      departamentName: "Guatemala",
      indication: received.direction.indication,
    };
    branches = [...branches, record];
    send(record, 201);
    return;
  }
  send({}, 404);
});
let app, web, browser;
try {
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe la configuración temporal de esta prueba.");
  fs.writeFileSync(temporaryConfig, fs.readFileSync("tsconfig.json"));
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
  config.distDir = ".next-map-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-map-check", typescript: { tsconfigPath: temporaryConfig } },
  });
  await app.prepare();
  web = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(appPort, host, resolve);
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([{ name: "access_token", value: "admin-map-test", url: base }]);
  const page = await context.newPage();
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4c8AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  for (const path of [
    "/system-admin/users",
    "/system-admin/branches",
    "/branch-admin/buses",
    "/branch-admin/drivers",
  ]) {
    await anonymousPage.goto(base + path);
    await expect(anonymousPage).toHaveURL(base + "/login");
  }
  await anonymous.close();
  await page.goto(base + "/admin/sucursales");
  await expect(page).toHaveURL(base + "/system-admin/branches");
  await expect(page.getByRole("heading", { name: "Nuestra red, en el mapa." })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon[title="Sede Central"]')).toHaveCount(1);
  await page.getByRole("banner").getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page).toHaveURL(base + "/system-admin/users");
  await expect(
    page.getByRole("heading", { name: "Un nuevo integrante del equipo.", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Rol del usuario", { exact: true })).toBeEnabled();
  await page.getByRole("banner").getByRole("link", { name: "Sucursales", exact: true }).click();
  await expect(page).toHaveURL(base + "/system-admin/branches");
  await expect(page.locator('.leaflet-marker-icon[title="Sede Central"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre de la sucursal").fill("Sucursal de prueba");
  await page.getByLabel("Teléfono", { exact: true }).fill("55550000");
  await page.getByLabel("Departamento", { exact: true }).selectOption("1");
  await page.getByLabel("Municipio", { exact: true }).selectOption("7");
  await page.getByLabel("Dirección e indicaciones").fill("Ubicación de prueba");
  await page.locator(".leaflet-container").click({ position: { x: 240, y: 180 } });
  const first = Number(await page.getByLabel("Latitud", { exact: true }).inputValue());
  assert.ok(Number.isFinite(first));
  const marker = page.locator('.leaflet-marker-icon[title="Ubicación seleccionada"]');
  await expect(marker).toBeVisible();
  const box = await marker.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.getByLabel("Latitud", { exact: true }).inputValue()))
    .not.toBe(first);
  const chosen = {
    latitude: Number(await page.getByLabel("Latitud", { exact: true }).inputValue()),
    longitude: Number(await page.getByLabel("Longitud", { exact: true }).inputValue()),
  };
  assert.equal(writeCount, 0);
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/branches-create-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Guardar sucursal" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "guardada correctamente" }),
  ).toBeVisible();
  assert.equal(writeCount, 1);
  assert.equal(received.direction.latitude, chosen.latitude);
  assert.equal(received.direction.longitude, chosen.longitude);
  await expect(page.locator('.leaflet-marker-icon[title="Sucursal de prueba"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  await page.getByRole("button", { name: /Ver en mapa.*Sucursal de prueba/ }).click();
  await page.getByRole("button", { name: "Editar sucursal: Sucursal de prueba" }).click();
  await expect(page.getByRole("heading", { name: "Editar sucursal", exact: true })).toBeVisible();
  await expect(page.getByLabel("Municipio", { exact: true })).toHaveValue("7");
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue(String(chosen.latitude));
  await page.getByLabel("Nombre de la sucursal").fill("Sucursal renovada");
  await page.getByLabel("Teléfono", { exact: true }).fill("55551111");
  await page.getByLabel("Latitud", { exact: true }).fill("14.6201234");
  await page.getByLabel("Longitud", { exact: true }).fill("-90.5201234");
  await expect(page.locator('.leaflet-marker-icon[title="Ubicación seleccionada"]')).toBeVisible();
  assert.equal(updateCount, 0);
  await page.screenshot({ path: "test-results/branches-edit-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "actualizada correctamente" }),
  ).toBeVisible();
  assert.equal(updateCount, 1);
  assert.equal(writeCount, 1);
  assert.equal(receivedUpdate.direction.municipalityId, 7);
  assert.equal(receivedUpdate.direction.latitude, 14.6201234);
  assert.equal(receivedUpdate.direction.longitude, -90.5201234);
  await page.reload();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  await expect(page.locator('.leaflet-marker-icon[title="Sucursal renovada"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Editar sucursal: Sucursal renovada" }).click();
  await expect(page.getByLabel("Teléfono", { exact: true })).toHaveValue("55551111");
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("14.6201234");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/branches-edit-mobile.png", fullPage: true });
  await page.getByLabel("Nombre de la sucursal").fill("Cambio descartado");
  await page.getByRole("button", { name: "Cancelar edición de sucursal" }).click();
  assert.equal(updateCount, 1);
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/branches-create-mobile.png", fullPage: true });
  const customer = await browser.newContext();
  await customer.addCookies([{ name: "access_token", value: "customer-map-test", url: base }]);
  for (const path of [
    "/system-admin/users",
    "/system-admin/branches",
    "/branch-admin/buses",
    "/branch-admin/drivers",
  ])
    assert.equal((await customer.request.get(base + path)).status(), 404);
  const blocked = await customer.request.post(base + "/api/admin/branches", {
    headers: { Origin: base },
    data: { name: "No autorizado" },
  });
  assert.equal(blocked.status(), 403);
  assert.equal(
    (
      await customer.request.put(base + "/api/admin/branches/2", {
        headers: { Origin: base },
        data: {},
      })
    ).status(),
    403,
  );
  assert.equal(updateCount, 1);
  assert.equal(writeCount, 1);

  const manager = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await manager.addCookies([{ name: "access_token", value: "branch-admin-test", url: base }]);
  const managerPage = await manager.newPage();
  await managerPage.goto(base + "/");
  const managerNav = managerPage.getByRole("navigation", {
    name: "Navegación de administrador de sucursales",
    exact: true,
  });
  await expect(managerNav).toBeVisible();
  for (const label of ["Buses", "Choferes", "Viajes"])
    await expect(managerNav.getByRole("button", { name: label, exact: true })).toBeDisabled();
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeEnabled();
  await expect(managerPage.getByLabel("Administrar sucursal")).toHaveValue("");
  await managerPage.getByLabel("Administrar sucursal").selectOption("2");
  await expect(managerPage.getByRole("status")).toContainText("Administrando: Sucursal renovada");
  const selectedCookie = (await manager.cookies()).find(
    (cookie) => cookie.name === "managed_branch_id",
  );
  assert.equal(selectedCookie?.value, "2");
  assert.equal(selectedCookie?.httpOnly, true);
  await managerPage.reload();
  await expect(managerPage.getByLabel("Administrar sucursal")).toHaveValue("2");
  await expect(managerPage.getByRole("status")).toContainText("Administrando: Sucursal renovada");
  assert.equal(
    (
      await manager.request.put(base + "/api/branch-admin/context", {
        headers: { Origin: base },
        data: { branchId: 999 },
      })
    ).status(),
    403,
  );
  assert.equal(
    (await manager.cookies()).find((cookie) => cookie.name === "managed_branch_id")?.value,
    "2",
  );
  await managerPage.screenshot({
    path: "test-results/branch-admin-navigation-desktop.png",
    fullPage: true,
  });
  await managerPage.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.getByLabel("Administrar sucursal").selectOption("1");
  await expect(managerPage.getByRole("status")).toContainText("Administrando: Sede Central");
  await managerPage.screenshot({
    path: "test-results/branch-admin-navigation-mobile.png",
    fullPage: true,
  });

  await managerPage.getByRole("link", { name: "Buses", exact: true }).click();
  await expect(
    managerPage.getByRole("heading", { name: "Buses de tu sucursal.", exact: true }),
  ).toBeVisible();
  await managerPage.getByRole("link", { name: "Crear bus", exact: true }).click();
  await expect(managerPage.getByRole("heading", { name: "Crear bus", exact: true })).toBeVisible();
  await managerPage.getByLabel("Marca", { exact: true }).fill("Borrador");
  await managerPage.getByLabel("Administrar sucursal").selectOption("2");
  await expect(managerPage.getByText("Sucursal: Sucursal renovada", { exact: true })).toBeVisible();
  await expect(managerPage.getByLabel("Marca", { exact: true })).toHaveValue("");
  const fillBus = async () => {
    for (const [label, value] of Object.entries({
      "Número de placa": "EXISTENTE",
      Marca: "Marca de prueba",
      Color: "Azul",
      "Modelo (año)": "2025",
      "Año de fabricación": "2024",
      "Kilometraje inicial": "100",
      "Filas de asientos": "12",
      "Columnas de asientos": "4",
    }))
      await managerPage.getByLabel(label, { exact: true }).fill(value);
  };
  await fillBus();
  await expect(managerPage.getByLabel("Capacidad de pasajeros")).toHaveValue("48");
  await managerPage.getByRole("button", { name: "Crear bus", exact: true }).click();
  await expect(
    managerPage.getByRole("alert").filter({ hasText: "Ya existe un bus con esa placa." }),
  ).toBeVisible();
  assert.equal(busWrites, 0);
  await expect(managerPage.getByLabel("Marca", { exact: true })).toHaveValue("Marca de prueba");
  await managerPage.getByLabel("Número de placa", { exact: true }).fill("C123ABC");
  await managerPage.screenshot({ path: "test-results/create-bus-mobile.png", fullPage: true });
  await managerPage.getByRole("button", { name: "Crear bus", exact: true }).click();
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeDisabled();
  await expect(managerPage.getByRole("heading", { name: "Bus creado", exact: true })).toBeVisible();
  assert.equal(receivedBus.branchId, 2);
  assert.equal(receivedBus.capacity, 48);
  assert.equal(busWrites, 1);
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeEnabled();
  await managerPage.getByRole("button", { name: "Crear otro bus", exact: true }).click();
  await expect(managerPage.getByLabel("Número de placa")).toHaveValue("");
  await expect(managerPage.getByLabel("Filas de asientos")).toHaveValue("");
  await managerPage.getByRole("link", { name: "Choferes", exact: true }).click();
  await expect(
    managerPage.getByRole("heading", { name: "Choferes de tu sucursal.", exact: true }),
  ).toBeVisible();
  await managerPage.getByRole("link", { name: "Crear chofer", exact: true }).click();
  await expect(
    managerPage.getByRole("heading", { name: "Crear chofer", exact: true }),
  ).toBeVisible();
  for (const [label, value] of Object.entries({
    Nombre: "Ana",
    Apellido: "Lopez",
    DPI: "1234567890123",
    NIT: "1234567",
    Teléfono: "55555555",
    "Correo electrónico": "chofer@example.com",
    Dirección: "Zona central",
    "Salario base (Q)": "5000",
    "Número de licencia": "LIC-123",
    "Vencimiento de la licencia": "2030-12-31",
  }))
    await managerPage.getByLabel(label, { exact: true }).fill(value);
  await managerPage.getByLabel("Tipo de licencia", { exact: true }).selectOption("1");
  await managerPage.getByLabel("Fotografía del chofer").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4c8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.screenshot({ path: "test-results/create-driver-mobile.png", fullPage: true });
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage.screenshot({ path: "test-results/create-driver-desktop.png", fullPage: true });
  await managerPage.getByRole("button", { name: "Crear chofer", exact: true }).click();
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeDisabled();
  await expect(
    managerPage.getByRole("heading", { name: "Registro en proceso", exact: true }),
  ).toBeVisible();
  await expect(
    managerPage.getByRole("heading", { name: "Chofer registrado", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  assert.equal(driverWrites, 1);
  assert.equal(receivedDriver.branchId, 2);
  assert.equal(receivedDriver.license.licenseType, 1);
  assert.equal(receivedPhoto.requestType, "application/json");
  assert.equal(receivedPhoto.type, "image/png");
  assert.ok(receivedPhoto.size > 0);
  assert.equal(new URL(managerPage.url()).searchParams.get("operationId"), driverOperationId);
  await managerPage.reload();
  await expect(
    managerPage.getByRole("heading", { name: "Chofer registrado", exact: true }),
  ).toBeVisible();
  assert.equal(driverWrites, 1);
  const otherBranch = await manager.request.post(base + "/api/branch-admin/buses", {
    headers: { Origin: base },
    data: { ...receivedBus, branchId: 1 },
  });
  assert.equal(otherBranch.status(), 409);
  assert.equal(busWrites, 1);
  const foreignDriver = await manager.request.get(
    base + "/api/branch-admin/drivers/99/operations/" + driverOperationId + "?branchId=2",
  );
  assert.equal(foreignDriver.status(), 403);
  const forbiddenBus = await customer.request.post(base + "/api/branch-admin/buses", {
    headers: { Origin: base },
    data: receivedBus,
  });
  assert.equal(forbiddenBus.status(), 403);
  await managerPage.screenshot({
    path: "test-results/create-driver-confirmed.png",
    fullPage: true,
  });

  await managerPage.getByRole("link", { name: "Ver choferes", exact: true }).click();
  await expect(
    managerPage.getByRole("table", { name: "Choferes de Sucursal renovada", exact: true }),
  ).toBeVisible();
  await managerPage.getByRole("link", { name: "Buses", exact: true }).click();
  const busTable = managerPage.getByRole("table", {
    name: "Buses de Sucursal renovada",
    exact: true,
  });
  await expect(busTable.getByText("C123ABC", { exact: true })).toBeVisible();
  await managerPage.getByLabel("Buscar por placa, marca o modelo").fill("sin coincidencia");
  await expect(
    managerPage.getByText("No hay coincidencias con la búsqueda o el estado seleccionado."),
  ).toBeVisible();
  await managerPage.getByLabel("Buscar por placa, marca o modelo").fill("C123");
  await expect(busTable.getByText("C123ABC", { exact: true })).toBeVisible();
  await managerPage.getByLabel("Buscar por placa, marca o modelo").fill("");
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("AVAILABLE");
  await expect(busTable.getByText("Disponible", { exact: true })).toBeVisible();
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage.screenshot({
    path: "test-results/fleet-buses-list-desktop.png",
    fullPage: true,
  });
  failNextBusAvailability = true;
  await managerPage.getByRole("button", { name: "Desactivar Bus C123ABC", exact: true }).click();
  await expect(
    managerPage.getByRole("alert").filter({ hasText: "Se volverá a consultar el listado" }),
  ).toBeVisible();
  await expect(
    managerPage.getByRole("button", { name: "Desactivar Bus C123ABC", exact: true }),
  ).toBeEnabled();
  assert.equal(busAvailabilityWrites, 0);
  assert.equal(busAvailabilityAttempts, 1);
  await managerPage
    .getByRole("button", { name: "Desactivar Bus C123ABC", exact: true })
    .evaluate((element) => {
      element.click();
      element.click();
    });
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeDisabled();
  await expect(
    managerPage.getByRole("status").filter({ hasText: "Bus C123ABC: desactivado." }),
  ).toBeVisible();
  assert.equal(busAvailabilityWrites, 1);
  assert.equal(busAvailabilityAttempts, 2);
  await expect(busTable.getByText("C123ABC", { exact: true })).toHaveCount(0);
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("");
  await expect(busTable.getByText("Fuera de servicio", { exact: true })).toBeVisible();
  await managerPage.reload();
  await expect(
    managerPage.getByRole("button", { name: "Activar Bus C123ABC", exact: true }),
  ).toBeVisible();
  await managerPage.getByRole("button", { name: "Activar Bus C123ABC", exact: true }).click();
  await expect(
    managerPage.getByRole("status").filter({ hasText: "Bus C123ABC: activado." }),
  ).toBeVisible();
  await expect(busTable.getByText("Disponible", { exact: true })).toBeVisible();
  assert.equal(busAvailabilityWrites, 2);
  let failList = true;
  await managerPage.route("**/api/branch-admin/buses?branchId=1", (route) => {
    if (failList) {
      return route.fulfill({
        status: 503,
        json: { detail: "Listado temporalmente no disponible." },
      });
    }
    return route.continue();
  });
  await managerPage.getByLabel("Administrar sucursal").selectOption("1");
  await expect(
    managerPage.getByText("Listado temporalmente no disponible.", { exact: true }),
  ).toBeVisible();
  await expect(managerPage.getByText("C123ABC", { exact: true })).toHaveCount(0);
  failList = false;
  await managerPage.getByRole("button", { name: "Reintentar listado", exact: true }).click();
  const centralBuses = managerPage.getByRole("table", {
    name: "Buses de Sede Central",
    exact: true,
  });
  await expect(centralBuses).toBeVisible();
  await expect(
    managerPage.getByRole("navigation", { name: "Paginación del listado" }),
  ).toBeVisible();
  await managerPage.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(centralBuses.getByText("CENTRAL-11", { exact: true })).toBeVisible();
  await managerPage.getByLabel("Buscar por placa, marca o modelo").fill("CENTRAL-1");
  await expect(centralBuses.getByText("CENTRAL-1", { exact: true })).toBeVisible();
  await managerPage.getByLabel("Administrar sucursal").selectOption("2");
  await expect(
    managerPage
      .getByRole("table", { name: "Buses de Sucursal renovada", exact: true })
      .getByText("C123ABC", { exact: true }),
  ).toBeVisible();
  await managerPage.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.screenshot({
    path: "test-results/fleet-buses-list-mobile.png",
    fullPage: true,
  });
  await managerPage.getByRole("link", { name: "Choferes", exact: true }).click();
  const driverTable = managerPage.getByRole("table", {
    name: "Choferes de Sucursal renovada",
    exact: true,
  });
  await expect(driverTable.getByText("Ana Lopez", { exact: true })).toBeVisible();
  await expect(driverTable.getByText("Registro rechazado", { exact: true })).toBeVisible();
  await expect(
    driverTable.getByRole("link", { name: "Ver estado de Rosa Pendiente", exact: true }),
  ).toBeVisible();
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("ACTIVE");
  await expect(driverTable.getByText("Ana Lopez", { exact: true })).toBeVisible();
  await expect(driverTable.getByText("Rosa Pendiente", { exact: true })).toHaveCount(0);
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("");
  await managerPage.getByLabel("Buscar por nombre, correo o licencia").fill("LIC-123");
  await expect(driverTable.getByText("Ana Lopez", { exact: true })).toBeVisible();
  await managerPage.getByLabel("Buscar por nombre, correo o licencia").fill("");
  await managerPage.screenshot({
    path: "test-results/fleet-drivers-list-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage.screenshot({
    path: "test-results/fleet-drivers-list-desktop.png",
    fullPage: true,
  });
  await expect(
    driverTable.getByRole("row").filter({ hasText: "Carlos Rechazado" }).getByRole("button"),
  ).toHaveCount(0);
  await expect(
    driverTable.getByRole("row").filter({ hasText: "Rosa Pendiente" }).getByRole("button"),
  ).toHaveCount(0);
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("ACTIVE");
  await managerPage
    .getByRole("button", { name: "Desactivar chofer Ana Lopez", exact: true })
    .evaluate((element) => {
      element.click();
      element.click();
    });
  await expect(managerPage.getByLabel("Administrar sucursal")).toBeDisabled();
  await expect(
    managerPage.getByRole("status").filter({ hasText: "chofer Ana Lopez: desactivado." }),
  ).toBeVisible();
  assert.equal(driverAvailabilityWrites, 1);
  await expect(driverTable.getByText("Ana Lopez", { exact: true })).toHaveCount(0);
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("INACTIVE");
  await expect(driverTable.getByText("Inactivo", { exact: true })).toBeVisible();
  await managerPage.reload();
  await expect(
    managerPage.getByRole("button", { name: "Activar chofer Ana Lopez", exact: true }),
  ).toBeVisible();
  await managerPage.getByRole("button", { name: "Activar chofer Ana Lopez", exact: true }).click();
  await expect(
    managerPage.getByRole("status").filter({ hasText: "chofer Ana Lopez: activado." }),
  ).toBeVisible();
  await expect(driverTable.getByText("Activo", { exact: true })).toBeVisible();
  assert.equal(driverAvailabilityWrites, 2);
  for (const [resource, id] of [
    ["buses", 4],
    ["drivers", 31],
  ]) {
    assert.equal(
      (
        await customer.request.patch(base + `/api/branch-admin/${resource}/${id}/availability`, {
          headers: { Origin: base },
          data: { branchId: 2, active: false },
        })
      ).status(),
      403,
    );
  }
  assert.equal(
    (
      await manager.request.patch(base + "/api/branch-admin/buses/100/availability", {
        headers: { Origin: base },
        data: { branchId: 2, active: false },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await manager.request.patch(base + "/api/branch-admin/drivers/33/availability", {
        headers: { Origin: base },
        data: { branchId: 2, active: false },
      })
    ).status(),
    409,
  );
  assert.equal(busAvailabilityWrites, 2);
  assert.equal(driverAvailabilityWrites, 2);
  await managerPage.setViewportSize({ width: 390, height: 844 });
  await managerPage
    .getByRole("button", { name: "Actualizar salario de Ana Lopez", exact: true })
    .click();
  let salaryDialog = managerPage.getByRole("dialog", {
    name: "Actualizar salario base",
    exact: true,
  });
  await expect(salaryDialog.getByLabel("Nuevo salario base (Q)", { exact: true })).toHaveValue(
    "5000",
  );
  await salaryDialog.getByLabel("Nuevo salario base (Q)", { exact: true }).fill("6500");
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.screenshot({ path: "test-results/driver-salary-mobile.png", fullPage: true });
  await salaryDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(salaryWrites, 0);
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage
    .getByRole("button", { name: "Actualizar salario de Ana Lopez", exact: true })
    .click();
  salaryDialog = managerPage.getByRole("dialog", { name: "Actualizar salario base", exact: true });
  await expect(salaryDialog.getByLabel("Nuevo salario base (Q)", { exact: true })).toHaveValue(
    "5000",
  );
  await salaryDialog.getByLabel("Nuevo salario base (Q)", { exact: true }).fill("0");
  await salaryDialog.getByRole("button", { name: "Guardar salario", exact: true }).click();
  await expect(salaryDialog.getByRole("alert")).toContainText("mayor que cero");
  assert.equal(salaryWrites, 0);
  await salaryDialog.getByLabel("Nuevo salario base (Q)", { exact: true }).fill("6210.75");
  await salaryDialog
    .getByRole("button", { name: "Guardar salario", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(managerPage.locator("#managed-branch")).toBeDisabled();
  await expect(salaryDialog).toHaveCount(0);
  await expect(
    managerPage.getByRole("status").filter({ hasText: "Salario de Ana Lopez actualizado." }),
  ).toBeVisible();
  assert.equal(salaryWrites, 1);
  await expect(driverTable.getByRole("row").filter({ hasText: "Ana Lopez" })).toContainText(
    "6,210.75",
  );
  await managerPage.reload();
  await expect(driverTable.getByRole("row").filter({ hasText: "Ana Lopez" })).toContainText(
    "6,210.75",
  );
  await managerPage.setViewportSize({ width: 390, height: 844 });
  await managerPage
    .getByRole("button", { name: "Actualizar licencia de Ana Lopez", exact: true })
    .click();
  const licenseDialog = managerPage.getByRole("dialog", {
    name: "Actualizar licencia",
    exact: true,
  });
  await expect(licenseDialog.getByLabel("Número de licencia", { exact: true })).toHaveValue(
    "LIC-123",
  );
  await expect(licenseDialog.getByLabel("Tipo de licencia", { exact: true })).toHaveValue("1");
  await expect(licenseDialog.getByLabel("Vencimiento de la licencia", { exact: true })).toHaveValue(
    "2030-12-31",
  );
  await licenseDialog.getByLabel("Número de licencia", { exact: true }).fill("BORRADOR");
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.screenshot({ path: "test-results/driver-license-mobile.png", fullPage: true });
  await licenseDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(licenseWrites, 0);
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage
    .getByRole("button", { name: "Actualizar licencia de Ana Lopez", exact: true })
    .click();
  await expect(licenseDialog.getByLabel("Número de licencia", { exact: true })).toHaveValue(
    "LIC-123",
  );
  await licenseDialog.getByLabel("Vencimiento de la licencia", { exact: true }).fill("2029-12-31");
  await licenseDialog.getByRole("button", { name: "Guardar licencia", exact: true }).click();
  await expect(licenseDialog.getByRole("alert")).toContainText("no puede ser anterior");
  assert.equal(licenseWrites, 0);
  await licenseDialog.getByLabel("Vencimiento de la licencia", { exact: true }).fill("2032-12-31");
  await licenseDialog.getByLabel("Número de licencia", { exact: true }).fill("LIC-DUPLICADA");
  await licenseDialog.getByRole("button", { name: "Guardar licencia", exact: true }).click();
  await expect(licenseDialog.getByRole("alert")).toContainText("ya registrado");
  assert.equal(licenseWrites, 0);
  await licenseDialog.getByLabel("Número de licencia", { exact: true }).fill("LIC-RENOVADA");
  await licenseDialog.getByLabel("Tipo de licencia", { exact: true }).selectOption("2");
  await licenseDialog
    .getByRole("button", { name: "Guardar licencia", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(managerPage.locator("#managed-branch")).toBeDisabled();
  await expect(licenseDialog).toHaveCount(0);
  await expect(
    managerPage.getByRole("status").filter({ hasText: "Licencia de Ana Lopez actualizada." }),
  ).toBeVisible();
  assert.equal(licenseWrites, 1);
  await expect(driverTable.getByRole("row").filter({ hasText: "Ana Lopez" })).toContainText(
    "LIC-RENOVADA · B",
  );
  await managerPage.reload();
  await expect(driverTable.getByRole("row").filter({ hasText: "Ana Lopez" })).toContainText(
    "LIC-RENOVADA · B",
  );
  await managerPage
    .getByRole("button", { name: "Actualizar licencia de Ana Lopez", exact: true })
    .click();
  await expect(licenseDialog.getByLabel("Tipo de licencia", { exact: true })).toHaveValue("2");
  await expect(licenseDialog.getByLabel("Vencimiento de la licencia", { exact: true })).toHaveValue(
    "2032-12-31",
  );
  await licenseDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    (
      await customer.request.put(base + "/api/branch-admin/drivers/31/license", {
        headers: { Origin: base },
        data: { branchId: 2, number: "OTRA", expirationDate: "2033-01-01", licenseType: 1 },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await manager.request.put(base + "/api/branch-admin/drivers/31/license", {
        headers: { Origin: base },
        data: { branchId: 1, number: "OTRA", expirationDate: "2033-01-01", licenseType: 1 },
      })
    ).status(),
    409,
  );
  assert.equal(
    (await manager.request.get(base + "/api/branch-admin/drivers/99/license?branchId=2")).status(),
    403,
  );
  assert.equal(
    (await manager.request.get(base + "/api/branch-admin/drivers/33/license?branchId=2")).status(),
    409,
  );
  assert.equal(licenseWrites, 1);

  assert.equal(
    (
      await customer.request.patch(base + "/api/branch-admin/drivers/31/salary", {
        headers: { Origin: base },
        data: { branchId: 2, baseSalary: 7000 },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await manager.request.delete(base + "/api/branch-admin/drivers/31?branchId=2", {
        headers: { Origin: base },
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await manager.request.delete(base + "/api/branch-admin/drivers/33?branchId=2", {
        headers: { Origin: base },
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await manager.request.delete(base + "/api/branch-admin/drivers/99?branchId=2", {
        headers: { Origin: base },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await customer.request.delete(base + "/api/branch-admin/drivers/32?branchId=2", {
        headers: { Origin: base },
      })
    ).status(),
    403,
  );
  assert.equal(deleteAttempts, 0);

  await managerPage.getByRole("link", { name: "Solicitudes de registro", exact: true }).click();
  await expect(
    managerPage.getByRole("heading", { name: "Solicitudes de choferes.", exact: true }),
  ).toBeVisible();
  const requestsTable = managerPage.getByRole("table", {
    name: "Solicitudes de Sucursal renovada",
    exact: true,
  });
  await expect(requestsTable.getByText("Correo ya registrado", { exact: true })).toBeVisible();
  await expect(
    requestsTable.getByRole("row").filter({ hasText: "Rosa Pendiente" }).getByRole("button"),
  ).toHaveCount(0);
  await expect(
    requestsTable.getByRole("row").filter({ hasText: "Ana Lopez" }).getByRole("button"),
  ).toHaveCount(0);
  await managerPage
    .getByLabel("Buscar por nombre, correo o motivo", { exact: true })
    .fill("correo ya registrado");
  await expect(
    requestsTable.getByRole("row").filter({ hasText: "Carlos Rechazado" }),
  ).toBeVisible();
  await expect(requestsTable.getByText("Ana Lopez", { exact: true })).toHaveCount(0);
  await managerPage.getByLabel("Buscar por nombre, correo o motivo", { exact: true }).fill("");
  await managerPage.screenshot({
    path: "test-results/driver-requests-desktop.png",
    fullPage: true,
  });
  await managerPage.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await managerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await managerPage.screenshot({ path: "test-results/driver-requests-mobile.png", fullPage: true });
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("ACCOUNT_REJECTED");
  await requestsTable
    .getByRole("button", { name: "Eliminar solicitud de Carlos Rechazado", exact: true })
    .click();
  let deleteDialog = managerPage.getByRole("dialog", {
    name: "Eliminar solicitud rechazada",
    exact: true,
  });
  await expect(deleteDialog.getByText("Correo ya registrado", { exact: true })).toBeVisible();
  await managerPage.screenshot({
    path: "test-results/delete-driver-request-mobile.png",
    fullPage: true,
  });
  await deleteDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(deleteAttempts, 0);
  await requestsTable
    .getByRole("button", { name: "Eliminar solicitud de Carlos Rechazado", exact: true })
    .click();
  deleteDialog = managerPage.getByRole("dialog", {
    name: "Eliminar solicitud rechazada",
    exact: true,
  });
  await deleteDialog.getByRole("button", { name: "Confirmar eliminación", exact: true }).click();
  await expect(deleteDialog.getByRole("alert")).toContainText(
    "Al cerrar se consultará nuevamente el listado",
  );
  assert.equal(deleteWrites, 0);
  assert.equal(deleteAttempts, 1);
  await deleteDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(requestsTable.getByText("Carlos Rechazado", { exact: true })).toBeVisible();
  await requestsTable
    .getByRole("button", { name: "Eliminar solicitud de Carlos Rechazado", exact: true })
    .click();
  deleteDialog = managerPage.getByRole("dialog", {
    name: "Eliminar solicitud rechazada",
    exact: true,
  });
  await deleteDialog
    .getByRole("button", { name: "Confirmar eliminación", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(managerPage.locator("#managed-branch")).toBeDisabled();
  await expect(deleteDialog).toHaveCount(0);
  await expect(
    managerPage.getByRole("status").filter({ hasText: "Solicitud de Carlos Rechazado eliminada." }),
  ).toBeVisible();
  assert.equal(deleteWrites, 1);
  assert.equal(deleteAttempts, 2);
  await expect(
    managerPage.getByText("No hay coincidencias con la búsqueda o el estado seleccionado."),
  ).toBeVisible();
  await managerPage.getByLabel("Estado", { exact: true }).selectOption("");
  await expect(requestsTable.getByText("Carlos Rechazado", { exact: true })).toHaveCount(0);
  await expect(requestsTable.getByText("Ana Lopez", { exact: true })).toBeVisible();
  await managerPage.reload();
  await expect(requestsTable.getByText("Rosa Pendiente", { exact: true })).toBeVisible();
  await expect(requestsTable.getByText("Carlos Rechazado", { exact: true })).toHaveCount(0);
  await managerPage.getByLabel("Administrar sucursal").selectOption("1");
  await expect(
    managerPage.getByText("Aún no hay solicitudes de choferes en esta sucursal.", { exact: true }),
  ).toBeVisible();
  await managerPage.getByLabel("Administrar sucursal").selectOption("2");
  await expect(requestsTable.getByText("Ana Lopez", { exact: true })).toBeVisible();
  await managerPage.getByRole("link", { name: "Listado de choferes", exact: true }).click();
  await expect(driverTable).toBeVisible();
  await managerPage.setViewportSize({ width: 1440, height: 1100 });
  await managerPage.getByLabel("Administrar sucursal").selectOption("1");
  await expect(
    managerPage.getByText("Aún no hay choferes registrados en esta sucursal.", { exact: true }),
  ).toBeVisible();
  await managerPage.getByLabel("Administrar sucursal").selectOption("2");
  await expect(
    managerPage
      .getByRole("table", { name: "Choferes de Sucursal renovada", exact: true })
      .getByText("Ana Lopez", { exact: true }),
  ).toBeVisible();
  const currentReads = driverListReads;
  await managerPage.getByRole("button", { name: "Actualizar listado", exact: true }).click();
  await expect.poll(() => driverListReads).toBeGreaterThan(currentReads);
  await expect(
    managerPage.getByRole("table", { name: "Choferes de Sucursal renovada", exact: true }),
  ).toBeVisible();
  assert.equal(
    (await customer.request.get(base + "/api/branch-admin/buses?branchId=2")).status(),
    403,
  );
  assert.equal(
    (await customer.request.get(base + "/api/branch-admin/drivers?branchId=2")).status(),
    403,
  );
  assert.equal(busWrites, 1);
  assert.equal(driverWrites, 1);

  await managerPage
    .getByRole("banner")
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(managerPage).toHaveURL(base + "/login");
  assert.equal(
    (await manager.cookies()).some((cookie) => cookie.name === "managed_branch_id"),
    false,
  );
  await manager.close();
  const unassigned = await browser.newContext();
  await unassigned.addCookies([{ name: "access_token", value: "branch-admin-empty", url: base }]);
  const unassignedPage = await unassigned.newPage();
  await unassignedPage.goto(base + "/");
  await expect(unassignedPage.getByLabel("Administrar sucursal")).toBeDisabled();
  await expect(unassignedPage.getByRole("status")).toContainText(
    "todavía no tiene sucursales asignadas",
  );
  assert.equal(
    (
      await unassigned.request.put(base + "/api/branch-admin/context", {
        headers: { Origin: base },
        data: { branchId: 1 },
      })
    ).status(),
    403,
  );
  await unassigned.close();
  const single = await browser.newContext();
  await single.addCookies([{ name: "access_token", value: "branch-admin-single", url: base }]);
  const singlePage = await single.newPage();
  await singlePage.goto(base + "/");
  await expect(singlePage.getByLabel("Administrar sucursal")).toHaveValue("1");
  await expect(singlePage.getByRole("status")).toContainText("Administrando: Sede Central");
  await single.close();

  await customer.close();
  await context.close();
  process.stdout.write(
    "PASS: clic, arrastre, decimales, guardado unico, edicion, cancelacion, recarga de marcadores, navegacion por rol, selector de sucursales, alta de bus, multipart de chofer, confirmacion pendiente/completada, listados por sucursal, busqueda, filtros, paginacion, activacion/desactivacion sin envios duplicados, salario base, renovación de licencias, solicitudes rechazadas y eliminacion confirmada, recuperacion de errores, cierre de sesion, vista movil y permisos.\n",
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
  if (fs.existsSync(temporaryConfig)) fs.unlinkSync(temporaryConfig);
  process.exit(process.exitCode ?? 0);
}

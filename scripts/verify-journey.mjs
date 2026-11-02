import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
expect.configure({ timeout: 15000 });
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3300,
  apiPort = 3301,
  base = `http://localhost:${appPort}`;
const temporaryConfig = ".next-journey-check.tsconfig.json";
const user = {
  id: 70,
  name: "Ana",
  lastName: "Operadora",
  email: "branch@example.com",
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: false,
  branchIds: [2],
};
const branches = [
  { id: 2, name: "Central", active: true, latitude: 14.6, longitude: -90.5 },
  { id: 3, name: "Norte", active: true, latitude: 15.4, longitude: -90.3 },
];
const routes = [
  { routeId: 10, originBranchId: 2, destinationBranchId: 3, distanceKm: 100, ticketPrice: 50 },
];
const buses = [
  {
    id: 5,
    plateNumber: "C123ABC",
    brand: "Volvo",
    model: "Touring",
    state: "AVAILABLE",
    capacity: 40,
    currentKm: 1000,
    busTypeId: 1,
    rentalEnabled: true,
    photo: "",
  },
];
const drivers = [
  {
    id: 8,
    userId: 70,
    name: "Juan",
    lastName: "Chofer",
    email: "driver@example.com",
    status: "ACTIVE",
    photo: "",
    number: "123456",
    expirationDate: "2028-01-01",
    licenseTypeName: "A",
  },
  {
    id: 9,
    userId: 71,
    name: "Pedro",
    lastName: "Piloto",
    email: "other@example.com",
    status: "ACTIVE",
    photo: "",
  },
];
const types = [
  {
    id: 1,
    name: "Regular",
    capacity: 40,
    fuelEstimatePerKm: 2,
    depreciationPerKm: 0.1,
    suggestedDriverSalaryPerTrip: 120,
    active: true,
  },
];
const trips = [
  {
    tripId: 20,
    tripType: "REGULAR",
    status: "SCHEDULED",
    route: routes[0],
    operatingBranchId: 2,
    busId: 5,
    driverId: 8,
    scheduledDepartureAt: "2027-01-02T09:00:00-06:00",
    scheduledArrivalAt: "2027-01-02T12:00:00-06:00",
    price: 50,
    driverBaseSalarySnapshot: 120,
    departure: null,
    arrival: null,
  },
];
let writes = 0,
  routeHasTrips = true;
const failures = [];
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(status === 204 ? undefined : JSON.stringify(data));
  };
  try {
    const url = new URL(request.url, `http://${host}:${apiPort}`),
      path = url.pathname.replace(/^\/api\/v1\//, ""),
      token = request.headers.authorization?.replace(/^Bearer /, "");
    if (path === "users/profile")
      return send({
        ...user,
        role:
          token === "driver"
            ? { id: 4, name: "DRIVER" }
            : token === "customer"
              ? { id: 2, name: "CUSTOMER" }
              : user.role,
      });
    if (path === "branches") return send(branches);
    if (path === "branches/2") return send(branches[0]);
    if (path === "drivers/me" && token === "driver") return send(drivers[0]);
    if (path === "branches/2/buses") return send(buses);
    if (path === "branches/2/drivers") return send(drivers);
    if (path === "bus-types") return send(types);
    if (path === "routes" && request.method === "GET") return send(routes);
    if (path === "trips" && request.method === "GET") {
      if (!token)
        return send(
          trips
            .filter((trip) => trip.status === "SCHEDULED")
            .map((trip) => ({
              tripId: trip.tripId,
              routeId: trip.route.routeId,
              busId: trip.busId,
              departureAt: trip.scheduledDepartureAt,
              price: trip.price,
              seatsAvailable: 40,
            })),
        );
      return send(
        trips.filter(
          (trip) =>
            !url.searchParams.has("driverId") ||
            trip.driverId === Number(url.searchParams.get("driverId")),
        ),
      );
    }
    if (path.startsWith("trips/") && request.method === "GET")
      return send(trips.find((trip) => trip.tripId === Number(path.split("/")[1])));
    if (!["branch", "driver"].includes(token)) return send({}, 403);
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = raw ? JSON.parse(raw) : null;
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (path === "routes" && request.method === "POST") {
      const route = { ...input, routeId: 11 };
      routes.push(route);
      writes++;
      return send(route, 201);
    }
    if (/^routes\/\d+$/.test(path)) {
      const id = Number(path.split("/")[1]),
        index = routes.findIndex((item) => item.routeId === id);
      if (index < 0) return send({}, 404);
      if (request.method === "DELETE") {
        if (routeHasTrips && id === 10)
          return send({ detail: "La ruta tiene viajes asociados", code: "ROUTE_HAS_TRIPS" }, 409);
        routes.splice(index, 1);
        writes++;
        return send(null, 204);
      }
      if (request.method === "PATCH") {
        Object.assign(routes[index], input);
        writes++;
        return send(routes[index]);
      }
    }
    if (path === "trips" && request.method === "POST") {
      assert.equal(input.routeId, 10);
      assert.equal(input.busId, 5);
      assert.equal(input.driverId, 8);
      assert.equal(input.driverBaseSalary, 120);
      assert.match(input.scheduledDepartureAt, /-06:00$/);
      const trip = {
        ...trips[0],
        ...input,
        tripId: 21,
        route: routes.find((route) => route.routeId === input.routeId),
        price: routes[0].ticketPrice,
        driverBaseSalarySnapshot: input.driverBaseSalary,
      };
      delete trip.routeId;
      delete trip.driverBaseSalary;
      trips.push(trip);
      writes++;
      return send(
        {
          tripId: trip.tripId,
          status: trip.status,
          route: trip.route,
          busId: trip.busId,
          driverId: trip.driverId,
          price: trip.price,
        },
        201,
      );
    }
    const [kind, tripId, action] = path.split("/");
    if (kind === "trips") {
      const trip = trips.find((trip) => trip.tripId === Number(tripId));
      if (!trip) return send({}, 404);
      if (!action && request.method === "PATCH") {
        Object.assign(trip, {
          driverId: input.driverId,
          driverBaseSalarySnapshot: input.driverBaseSalary ?? trip.driverBaseSalarySnapshot,
        });
        writes++;
        return send({ tripId: trip.tripId, status: trip.status });
      }
      if (action === "cancel") {
        assert.ok(input.reason.trim());
        trip.status = "CANCELLING";
        writes++;
        return send({ tripId: trip.tripId, status: trip.status }, 202);
      }
      if (action === "departure") {
        assert.equal(trip.status, "SCHEDULED");
        trip.status = "IN_TRANSIT";
        trip.departure = input;
        writes++;
        return send({ tripId: trip.tripId, status: trip.status, departure: trip.departure });
      }
      if (action === "arrival") {
        assert.ok(input.endKm >= trip.departure.startKm);
        trip.status = "COMPLETED";
        trip.arrival = input;
        writes++;
        return send({ tripId: trip.tripId, status: trip.status, arrival: trip.arrival });
      }
    }
    return send({ detail: "Ruta simulada no encontrada" }, 404);
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
    throw new Error("Ya existe configuración temporal de Journey.");
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
  config.distDir = ".next-journey-check";
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
  await context.addCookies([{ name: "access_token", value: "branch", url: base }]);
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
  await page.goto(base + "/branch-admin/routes");
  await expect(page.getByRole("heading", { name: "Rutas de tu sucursal" })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("button", { name: "Crear ruta", exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Crear ruta", exact: true }).click();
  await page.getByLabel("Sucursal de destino").selectOption("3");
  await page.getByLabel("Distancia (km)").fill("200");
  await page.getByLabel("Precio del boleto (Q)").fill("60");
  const saveRoute = page.getByRole("button", { name: "Guardar ruta", exact: true });
  await expect(saveRoute).toBeEnabled();
  await saveRoute.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("Ruta guardada.", { exact: true })).toBeVisible({ timeout: 20000 });
  assert.equal(writes, 1);
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "Editar ruta #11", exact: true }).click();
  await page.getByLabel("Precio del boleto (Q)").fill("65");
  await saveRoute.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.equal(routes[1].ticketPrice, 65);
  await page.getByRole("button", { name: "Eliminar ruta #10", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click();
  await expect(page.getByText("La ruta tiene viajes asociados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Eliminar ruta #11", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click();
  await expect(page.getByText("Ruta eliminada.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Viajes", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Programar viaje", exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Programar viaje", exact: true }).click();
  await page.getByLabel("Ruta", { exact: true }).selectOption("10");
  await page.getByLabel("Bus", { exact: true }).selectOption("5");
  await page.getByLabel("Chofer", { exact: true }).selectOption("8");
  await expect(page.getByLabel("Salario base del viaje (Q, opcional)")).toHaveValue("120");
  await page.getByLabel("Salida prevista (Guatemala)").fill("2027-01-03T09:00");
  await page.getByLabel("Llegada prevista (Guatemala)").fill("2027-01-03T12:00");
  await page
    .getByRole("button", { name: "Confirmar programación", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByText("Viaje programado.", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  assert.equal(trips.length, 2);
  await page.getByRole("button", { name: "Reasignar chofer del viaje #21", exact: true }).click();
  await page.getByLabel("Chofer del viaje").selectOption("9");
  await page.getByRole("button", { name: "Confirmar datos", exact: true }).click();
  await expect(
    page.getByText("Chofer actualizado; el bus y la ruta se conservan.", { exact: true }),
  ).toBeVisible();
  assert.equal(trips[1].driverId, 9);
  await page.getByRole("button", { name: "Cancelar viaje del viaje #21", exact: true }).click();
  await page.getByLabel("Motivo de cancelación").fill("Incidencia operativa");
  await page.getByRole("button", { name: "Confirmar datos", exact: true }).click();
  await expect(
    page.getByText("Cancelación en proceso. Consulta el estado hasta que se confirme.", {
      exact: true,
    }),
  ).toBeVisible();
  const cancelling = page.locator("article").filter({ hasText: "Viaje #21" });
  await expect(cancelling.getByRole("button", { name: /Registrar salida/ })).toHaveCount(0);
  trips[1].status = "CANCELLED";
  await page.getByRole("button", { name: "Consultar estado de viajes", exact: true }).click();
  await expect(cancelling.getByText("Cancelado", { exact: true })).toBeVisible();
  await context.close();
  const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await driverContext.addCookies([{ name: "access_token", value: "driver", url: base }]);
  const driverPage = await driverContext.newPage();
  driverPage.on("pageerror", (error) => failures.push(String(error)));
  await driverPage.goto(base + "/driver/trips");
  await expect(driverPage.getByRole("heading", { name: "Mis viajes", exact: true })).toBeVisible();
  await expect(
    driverPage.getByRole("button", { name: "Registrar salida del viaje #20", exact: true }),
  ).toBeEnabled({ timeout: 20000 });
  await expect(
    driverPage.getByRole("button", { name: /Cancelar viaje|Reasignar chofer/ }),
  ).toHaveCount(0);
  assert.equal(
    (
      await driverContext.request.post(base + "/api/driver/trips/21/departure", {
        headers: { Origin: base },
        data: { actualDepartureAt: "2027-01-02T08:30:00-06:00", startKm: 1000 },
      })
    ).status(),
    403,
  );
  await driverPage
    .getByRole("button", { name: "Registrar salida del viaje #20", exact: true })
    .click();
  await driverPage.getByLabel("Fecha y hora real (Guatemala)").fill("2027-01-02T08:30");
  await driverPage.getByLabel("Kilometraje inicial").fill("1000");
  const confirm = driverPage.getByRole("button", { name: "Confirmar datos", exact: true });
  await confirm.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(driverPage.getByText("Salida registrada.", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  assert.equal(trips[0].status, "IN_TRANSIT");
  await driverPage
    .getByRole("button", { name: "Registrar llegada del viaje #20", exact: true })
    .click();
  await driverPage.getByLabel("Fecha y hora real (Guatemala)").fill("2027-01-02T12:00");
  await driverPage.getByLabel("Kilometraje final").fill("999");
  await driverPage.getByLabel("Gasto real de combustible (Q)").fill("0");
  await confirm.click();
  await expect(
    driverPage.getByText(
      "La llegada no puede ser anterior a la salida ni el kilometraje final menor al inicial.",
      { exact: true },
    ),
  ).toBeVisible();
  await driverPage.getByLabel("Kilometraje final").fill("1100");
  await confirm.click();
  await expect(
    driverPage.getByText("Llegada registrada. El viaje fue finalizado.", { exact: true }),
  ).toBeVisible();
  assert.equal(trips[0].arrival.fuelCost, 0);
  await expect(
    driverPage.getByRole("button", { name: /Registrar salida|Registrar llegada/ }),
  ).toHaveCount(0);
  assert.ok(await driverPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await driverPage.getByRole("link", { name: "Mi licencia", exact: true }).click();
  await expect(driverPage.getByText("123456", { exact: true })).toBeVisible();
  await driverContext.close();
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(base + "/trips");
  await expect(
    publicPage.getByText("No hay viajes disponibles para esta búsqueda.", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  trips[0].status = "SCHEDULED";
  trips[0].departure = null;
  trips[0].arrival = null;
  await publicPage.getByLabel("Origen", { exact: true }).selectOption("2");
  await publicPage.getByLabel("Destino", { exact: true }).selectOption("3");
  await publicPage.getByRole("button", { name: "Buscar viajes", exact: true }).click();
  await expect(
    publicPage.getByRole("heading", { name: "Central → Norte", exact: true }),
  ).toBeVisible();
  await expect(
    publicPage.getByText("Q50.00 por boleto · 40 asientos disponibles", { exact: true }),
  ).toBeVisible();
  await publicContext.close();
  assert.equal(writes, 8, "Cada confirmación debe producir una única escritura");
  assert.deepEqual(failures, []);
  process.stdout.write(
    "PASS SOLO_CONTRATO: rutas/mapa, eliminación restringida, programación, salario por tipo, reasignación, cancelación pendiente, chofer asignado, salida/llegada, doble clic, licencia, búsqueda pública y móvil.\n",
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

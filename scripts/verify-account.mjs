import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const appPort = 3220,
  apiPort = 3221,
  host = "127.0.0.1";
const base = `http://localhost:${appPort}`;
const temporaryConfig = ".next-account-check.tsconfig.json";
const roles = ["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "CAJERO", "DRIVER"];
const records = new Map(
  roles.map((role, index) => [
    `account-${role}`,
    {
      id: 100 + index,
      role: { id: index + 1, name: role === "CAJERO" ? "CASHIER" : role },
      name: "Cuenta",
      lastName: role,
      email: role.toLowerCase() + "@example.com",
      phone: "55555555",
      nit: "NIT-" + index,
      dpi: "123456789012" + index,
      adress: "Direccion original",
      isActive: true,
      resetPassword: false,
      twoFactorEnabled: true,
      branchIds: role === "SUCURSAL_ADMIN" ? [1] : [],
      customerId: null,
    },
  ]),
);
const driverUser = records.get("account-DRIVER");
const photoBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4c8AAAAASUVORK5CYII=",
  "base64",
);
const initialPhotoUrl = "https://profile-photos.test/current.png";
const driverPhotoUploads = [];
const driver = {
  id: 31,
  userId: driverUser.id,
  name: driverUser.name,
  lastName: driverUser.lastName,
  email: driverUser.email,
  phone: driverUser.phone,
  dpi: driverUser.dpi,
  nit: driverUser.nit,
  photo: initialPhotoUrl,
  status: "ACTIVE",
  pendingOperationId: null,
  updateFailureReason: null,
};
const operations = new Map();
let rejectDriverProfile = false;
let profileWrites = 0,
  driverWrites = 0,
  passwordWrites = 0;
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const user = records.get(token);
  if (!user) {
    send({}, 401);
    return;
  }
  if (request.url === "/api/v1/users/profile") {
    send(user);
    return;
  }
  if (request.url === "/api/v1/branches/1") {
    send({ id: 1, name: "Sede Central" });
    return;
  }
  if (request.url === "/api/v1/drivers/me") {
    if (rejectDriverProfile) {
      send({}, 401);
      return;
    }
    if (user.id !== driver.userId) {
      send({}, 404);
      return;
    }
    send(driver);
    return;
  }
  if (request.url === "/api/v1/users/profile/password" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const data = JSON.parse(raw);
    assert.deepEqual(Object.keys(data).sort(), ["confirmPassword", "currentPassword", "password"]);
    if (data.currentPassword !== "actual123") {
      send({ message: "La contraseña actual no es correcta." }, 400);
      return;
    }
    assert.equal(data.password, data.confirmPassword);
    await new Promise((resolve) => setTimeout(resolve, 300));
    passwordWrites++;
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.url === `/api/v1/users/${user.id}` && request.method === "PUT") {
    assert.notEqual(user.role.name, "DRIVER");
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const data = JSON.parse(raw);
    assert.deepEqual(Object.keys(data).sort(), [
      "adress",
      "email",
      "lastName",
      "name",
      "nit",
      "phone",
      "twoFactorEnabled",
    ]);
    assert.equal(data.twoFactorEnabled, user.twoFactorEnabled);
    await new Promise((resolve) => setTimeout(resolve, 300));
    Object.assign(user, data);
    profileWrites++;
    send(user);
    return;
  }
  if (request.url === "/api/v1/drivers/31" && request.method === "PUT") {
    assert.equal(user.id, driver.userId);
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const form = await new Request("http://localhost/drivers/31", {
      method: "PUT",
      headers: request.headers,
      body: Buffer.concat(chunks),
    }).formData();
    const requestPart = form.get("request");
    assert.equal(requestPart.type, "application/json");
    const data = JSON.parse(await requestPart.text());
    assert.deepEqual(Object.keys(data).sort(), [
      "adress",
      "dpi",
      "email",
      "lastName",
      "name",
      "nit",
      "phone",
      "photo",
    ]);
    assert.equal(data.photo, driver.photo);
    const photo = form.get("photo");
    driverPhotoUploads.push(photo !== null);
    if (photo !== null) {
      assert.equal(photo.type, "image/png");
      assert.deepEqual(Buffer.from(await photo.arrayBuffer()), photoBytes);
      data.photo = "https://profile-photos.test/updated-" + (driverWrites + 1) + ".png";
    }
    driverWrites++;
    const id = "550e8400-e29b-41d4-a716-44665544000" + driverWrites;
    driver.pendingOperationId = id;
    driver.updateFailureReason = null;
    operations.set(id, {
      operationId: id,
      driverId: driver.id,
      action: "UPDATE",
      status: "PENDING",
      failureReason: null,
      reads: 0,
      data,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    send(driver, 202);
    return;
  }
  const match = request.url.match(/^\/api\/v1\/drivers\/31\/operations\/([^/]+)$/);
  if (match) {
    assert.equal(user.id, driver.userId);
    const operation = operations.get(match[1]);
    if (!operation) {
      send({}, 404);
      return;
    }
    if (++operation.reads > 1 && operation.status === "PENDING") {
      if (operation.data.nit === "DUPLICADO") {
        operation.status = "REJECTED";
        operation.failureReason = "El NIT pertenece a otra cuenta.";
        driver.updateFailureReason = operation.failureReason;
      } else {
        operation.status = "COMPLETED";
        const { photo: _photo, ...fields } = operation.data;
        Object.assign(user, fields);
        Object.assign(driver, operation.data);
      }
      driver.pendingOperationId = null;
    }
    send({
      operationId: operation.operationId,
      driverId: operation.driverId,
      action: operation.action,
      status: operation.status,
      failureReason: operation.failureReason,
    });
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
    throw new Error("Ya existe una configuración temporal de la prueba de cuenta.");
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
  config.distDir = ".next-account-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-account-check", typescript: { tsconfigPath: temporaryConfig } },
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
  await anonymousPage.goto(base + "/mi-cuenta");
  await expect(anonymousPage).toHaveURL(base + "/login");
  assert.equal((await anonymous.request.get(base + "/api/account/profile")).status(), 401);
  await anonymous.close();

  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addCookies([{ name: "access_token", value: "account-" + role, url: base }]);
    const page = await context.newPage();
    if (role === "DRIVER")
      await page.route("https://profile-photos.test/**", (route) =>
        route.fulfill({ contentType: "image/png", body: photoBytes }),
      );
    const user = records.get("account-" + role);
    await page.goto(base + "/");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Mi perfil", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Cambiar contraseña", exact: true }),
    ).toBeVisible();
    if (role === "DRIVER") rejectDriverProfile = true;
    await page.getByRole("banner").getByRole("link", { name: "Mi perfil", exact: true }).click();
    if (role === "DRIVER") {
      await expect(
        page.getByRole("heading", { name: "No se pudo cargar tu cuenta", exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(base + "/mi-cuenta");
      await expect(
        page.getByRole("alert").filter({ hasText: "perfil de chofer en Fleet" }),
      ).toBeVisible();
      assert.ok((await context.cookies()).some((cookie) => cookie.name === "access_token"));
      rejectDriverProfile = false;
      await page.getByRole("link", { name: "Reintentar", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Mi perfil.", exact: true })).toBeVisible();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Cuenta");
    await expect(page.getByLabel("Dirección", { exact: true })).toHaveValue("Direccion original");
    assert.equal(
      (
        await context.request.put(base + "/api/account/profile", {
          headers: { Origin: base },
          data: { name: "Ataque", userId: 999, roleId: 1 },
        })
      ).status(),
      400,
    );
    if (role === "DRIVER") {
      const currentPhoto = page.getByRole("img", {
        name: "Foto de perfil del chofer",
        exact: true,
      });
      const photoInput = page.getByLabel("Nueva foto de perfil (opcional)", { exact: true });
      await expect(currentPhoto).toHaveAttribute("src", initialPhotoUrl);
      await expect.poll(() => currentPhoto.evaluate((image) => image.naturalWidth)).toBe(1);
      await photoInput.setInputFiles({
        name: "invalid.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("invalid"),
      });
      await expect(
        page.getByRole("alert").filter({ hasText: "Usa una fotografía JPG o PNG." }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Enviar cambios", exact: true }).click();
      assert.equal(driverWrites, 0);
      await photoInput.setInputFiles({
        name: "preview.png",
        mimeType: "image/png",
        buffer: photoBytes,
      });
      const preview = page.getByRole("img", {
        name: "Vista previa de la nueva foto de perfil",
        exact: true,
      });
      await expect(preview).toHaveAttribute("src", /^blob:/);
      await expect.poll(() => preview.evaluate((image) => image.naturalWidth)).toBe(1);
      await page.getByRole("button", { name: "Descartar nueva foto", exact: true }).click();
      await expect(currentPhoto).toHaveAttribute("src", initialPhotoUrl);
      assert.equal(await photoInput.evaluate((input) => input.files.length), 0);
      await photoInput.setInputFiles({
        name: "rejected.png",
        mimeType: "image/png",
        buffer: photoBytes,
      });
      await expect(page.getByLabel("DPI", { exact: true })).not.toHaveAttribute("readonly");
      await page.getByLabel("Nombre", { exact: true }).fill("Propuesta rechazada");
      await page.getByLabel("NIT", { exact: true }).fill("DUPLICADO");
      await page.getByRole("button", { name: "Enviar cambios", exact: true }).evaluate((button) => {
        button.click();
        button.click();
      });
      await expect(
        page.getByRole("status").filter({ hasText: "Actualización pendiente" }),
      ).toBeVisible();
      await expect(page.getByLabel("Nombre", { exact: true })).toBeDisabled();
      assert.equal(driverWrites, 1);
      assert.equal(user.name, "Cuenta");
      await page.reload();
      await expect(
        page
          .getByRole("main")
          .getByRole("alert")
          .filter({ hasText: "El NIT pertenece a otra cuenta." }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Enviar cambios", exact: true })).toBeEnabled();
      await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Cuenta");
      await expect(currentPhoto).toHaveAttribute("src", initialPhotoUrl);
      assert.equal(driver.photo, initialPhotoUrl);
      await photoInput.setInputFiles({
        name: "accepted.png",
        mimeType: "image/png",
        buffer: photoBytes,
      });
      await page.getByLabel("Nombre", { exact: true }).fill("Conductor actualizado");
      await page.getByLabel("NIT", { exact: true }).fill("NIT-NUEVO");
      await page.getByLabel("Teléfono", { exact: true }).fill("55550000");
      await page.getByLabel("Dirección", { exact: true }).fill("Direccion actualizada");
      await page.getByRole("button", { name: "Enviar cambios", exact: true }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Actualización pendiente" }),
      ).toBeVisible();
      const check = page.getByRole("button", { name: "Consultar estado", exact: true });
      await expect(check).toBeEnabled({ timeout: 15000 });
      await check.click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Tus datos fueron actualizados y confirmados." }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Conductor actualizado");
      await expect(page.getByLabel("Nombre", { exact: true })).toBeEnabled();
      await expect(page.getByRole("banner")).toContainText("Conductor actualizado");
      assert.equal(
        new URL(page.url()).searchParams.get("operationId"),
        "550e8400-e29b-41d4-a716-446655440002",
      );
      await page.reload();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Tus datos fueron actualizados y confirmados." }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Conductor actualizado");
      assert.equal(driverWrites, 2);
      await expect(currentPhoto).toHaveAttribute(
        "src",
        "https://profile-photos.test/updated-2.png",
      );
      await expect.poll(() => currentPhoto.evaluate((image) => image.naturalWidth)).toBe(1);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      await page.screenshot({
        path: "test-results/driver-profile-photo-mobile.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.getByLabel("Teléfono", { exact: true }).fill("55551111");
      await page.getByRole("button", { name: "Enviar cambios", exact: true }).click();
      await expect(check).toBeEnabled({ timeout: 15000 });
      await check.click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Tus datos fueron actualizados y confirmados." }),
      ).toBeVisible({ timeout: 15000 });
      await expect(currentPhoto).toHaveAttribute(
        "src",
        "https://profile-photos.test/updated-2.png",
      );
      assert.deepEqual(driverPhotoUploads, [true, true, false]);
      assert.equal(driverWrites, 3);
      assert.equal(user.phone, "55551111");
      assert.equal(user.adress, "Direccion actualizada");
    } else {
      await expect(page.getByLabel("DPI", { exact: true })).toHaveAttribute("readonly", "");
      await page.getByLabel("Nombre", { exact: true }).fill("Actualizado " + role);
      await page
        .getByLabel("Correo electrónico", { exact: true })
        .fill("nuevo_" + role.toLowerCase() + "@example.com");
      await page.getByLabel("Dirección", { exact: true }).fill("Direccion actualizada");
      await page
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .evaluate((button) => {
          button.click();
          button.click();
        });
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Tus datos fueron actualizados correctamente." }),
      ).toBeVisible();
      await expect(page.getByLabel("Nombre", { exact: true })).toBeEnabled();
      assert.equal(user.twoFactorEnabled, true);
      assert.equal(user.name, "Actualizado " + role);
      await page.reload();
      await expect(page.getByLabel("Dirección", { exact: true })).toHaveValue(
        "Direccion actualizada",
      );
    }
    if (role === "CUSTOMER") {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      await page.screenshot({ path: "test-results/account-profile-mobile.png", fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.screenshot({ path: "test-results/account-profile-desktop.png", fullPage: true });
    }
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Cambiar contraseña", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Cambia tu contraseña.", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill(role === "CUSTOMER" ? "incorrecta" : "actual123");
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("nueva123");
    await page.getByLabel("Confirmar nueva contraseña", { exact: true }).fill("nueva123");
    if (role === "CUSTOMER") {
      await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "La contraseña actual no es correcta.",
      );
      assert.equal(
        (await context.cookies()).some((cookie) => cookie.name === "access_token"),
        true,
      );
      await page.getByLabel("Contraseña actual", { exact: true }).fill("actual123");
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      await page.screenshot({ path: "test-results/account-password-mobile.png", fullPage: true });
    }
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await expect(
      page.getByRole("heading", { name: "Contraseña actualizada", exact: true }),
    ).toBeVisible();
    assert.equal(
      (await context.cookies()).some((cookie) => cookie.name === "access_token"),
      false,
    );
    await page.getByRole("link", { name: "Iniciar sesión", exact: true }).click();
    await expect(page).toHaveURL(base + "/login");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Crear cuenta", exact: true }),
    ).toBeVisible();
    await context.close();
  }
  assert.equal(profileWrites, 4);
  assert.equal(driverWrites, 3);
  assert.equal(passwordWrites, 5);
  process.stdout.write(
    "PASS: barras de los cinco roles, perfil propio, datos precargados, cambios por DriverController, saga pendiente/rechazada/completada, fotografía visible y actualización multipart opcional, contraseña actual, cierre de sesión y vista móvil.\n",
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

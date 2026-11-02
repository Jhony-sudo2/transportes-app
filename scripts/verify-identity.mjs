import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3240,
  apiPort = 3241;
const base = `http://localhost:${appPort}`,
  temporaryConfig = ".next-identity-check.tsconfig.json";
const user = {
  id: 31,
  customerId: 7001,
  name: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  nit: "1234567",
  dpi: "1234567890123",
  phone: "55555555",
  adress: "Centro",
  role: { id: 2, name: "CUSTOMER" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: true,
  branchIds: [],
};
let verified = false,
  challengeUsed = false,
  pendingEmail = null;
let registrationWrites = 0,
  confirmationWrites = 0,
  tfaWrites = 0,
  changeWrites = 0,
  changeConfirmWrites = 0;
const failures = [];
const api = http.createServer(async (request, response) => {
  const send = (body, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  try {
    let text = "";
    for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : null;
    const path = request.url;
    if (path === "/api/v1/auth/register") {
      assert.deepEqual(Object.keys(body).sort(), [
        "address",
        "dpi",
        "email",
        "lastName",
        "name",
        "nit",
        "password",
        "phone",
      ]);
      assert.equal(body.nit, user.nit);
      registrationWrites++;
      await new Promise((resolve) => setTimeout(resolve, 150));
      send({ userId: user.id, customerId: user.customerId, emailVerificationRequired: true }, 201);
      return;
    }
    if (path === "/api/v1/auth/email-verification/resend") {
      assert.deepEqual(Object.keys(body), ["email"]);
      send({ accepted: true });
      return;
    }
    if (path === "/api/v1/auth/email-confirm") {
      assert.deepEqual(Object.keys(body), ["token"]);
      if (body.token === "expired") {
        send(
          { code: "EMAIL_TOKEN_EXPIRED", detail: "El enlace ha vencido", correlationId: "email-1" },
          410,
        );
        return;
      }
      assert.equal(body.token, "register-valid");
      if (verified) {
        send({ code: "EMAIL_ALREADY_VERIFIED", detail: "Correo ya confirmado" }, 409);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      verified = true;
      confirmationWrites++;
      send({ emailVerified: true });
      return;
    }
    if (path === "/api/v1/auth/login") {
      assert.deepEqual(Object.keys(body).sort(), ["email", "password"]);
      if (!verified) {
        send(
          { code: "EMAIL_NOT_VERIFIED", detail: "Confirma tu correo antes de iniciar sesión" },
          403,
        );
        return;
      }
      challengeUsed = false;
      send({ challengeId: "challenge-1", requires2FA: true });
      return;
    }
    if (path === "/api/v1/auth/login/tfa") {
      assert.deepEqual(Object.keys(body).sort(), ["challengeId", "code"]);
      assert.equal(body.challengeId, "challenge-1");
      if (body.code !== "123456" || challengeUsed) {
        send({ code: "INVALID_CODE", detail: "Código incorrecto o utilizado" }, 401);
        return;
      }
      challengeUsed = true;
      tfaWrites++;
      send({ accessToken: "private-session" });
      return;
    }
    if (path === "/api/v1/users/profile/email-confirm") {
      assert.deepEqual(Object.keys(body), ["token"]);
      assert.equal(body.token, "change-valid");
      assert.ok(pendingEmail);
      user.email = pendingEmail;
      pendingEmail = null;
      changeConfirmWrites++;
      send({ emailVerified: true });
      return;
    }
    if (request.headers.authorization !== "Bearer private-session") {
      send({}, 401);
      return;
    }
    if (path === "/api/v1/users/profile") {
      send(user);
      return;
    }
    if (path === "/api/v1/users/profile/email-change") {
      assert.deepEqual(Object.keys(body), ["email"]);
      if (body.email === "ocupado@example.com") {
        send({ message: "El correo pertenece a otra cuenta" }, 409);
        return;
      }
      pendingEmail = body.email;
      changeWrites++;
      send({ verificationPending: true });
      return;
    }
    send({}, 404);
  } catch (error) {
    failures.push(String(error));
    send({ detail: "Fallo del escenario simulado" }, 500);
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
  config.distDir = ".next-identity-check";
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
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(String(error)));
  await page.goto(base + "/register");
  for (const [name, value] of Object.entries({
    Nombre: user.name,
    Apellido: user.lastName,
    DPI: user.dpi,
    NIT: user.nit,
    Teléfono: user.phone,
    Dirección: user.adress,
    "Correo electrónico": user.email,
    Contraseña: "password123",
    "Confirmar contraseña": "password123",
  }))
    await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(
    page.getByRole("heading", { name: "Confirma tu correo.", exact: true }),
  ).toBeVisible();
  assert.equal(registrationWrites, 1);
  assert.equal(
    (await context.cookies()).some((cookie) => cookie.name === "access_token"),
    false,
  );
  await page.goto(base + "/login");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Confirma tu correo");
  await page.goto(base + "/auth/verify-email?token=expired");
  await expect(page.getByRole("button", { name: "Confirmar correo", exact: true })).toBeEnabled();
  assert.equal(confirmationWrites, 0);
  await expect(page).toHaveURL(base + "/auth/verify-email");
  await page.getByRole("button", { name: "Confirmar correo", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "vencido" })).toBeVisible();
  await page.getByRole("link", { name: "Solicitar otro enlace", exact: true }).click();
  await page.getByLabel("Correo electrónico", { exact: true }).fill("desconocido@example.com");
  await page.getByRole("button", { name: "Solicitar enlace", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Si hay una cuenta pendiente");
  const view = await page.goto(base + "/auth/verify-email?token=register-valid");
  assert.equal(view.headers()["referrer-policy"], "no-referrer");
  await expect(page.getByRole("button", { name: "Confirmar correo", exact: true })).toBeEnabled();
  assert.equal(confirmationWrites, 0);
  await page.getByRole("button", { name: "Confirmar correo", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("status")).toContainText("Tu correo fue verificado");
  assert.equal(confirmationWrites, 1);
  await page.goto(base + "/login");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveCount(0);
  assert.equal(
    (await context.cookies()).some((cookie) => cookie.name === "access_token"),
    false,
  );
  await page.getByLabel("Código de verificación", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Código incorrecto");
  await page.getByLabel("Código de verificación", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page).toHaveURL(base + "/");
  assert.equal(tfaWrites, 1);
  assert.equal(
    (await context.cookies()).find((cookie) => cookie.name === "access_token").httpOnly,
    true,
  );
  await page.goto(base + "/mi-cuenta");
  await expect(page.getByLabel("NIT", { exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByLabel("Nuevo correo electrónico", { exact: true }).fill("ocupado@example.com");
  await page.getByRole("button", { name: "Solicitar cambio de correo", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "pertenece a otra cuenta" }),
  ).toBeVisible();
  await page.getByLabel("Nuevo correo electrónico", { exact: true }).fill("nuevo@example.com");
  await page.getByRole("button", { name: "Solicitar cambio de correo", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Cambio pendiente de verificación");
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toHaveValue(
    "ana@example.com",
  );
  assert.equal(changeWrites, 1);
  assert.equal(user.email, "ana@example.com");
  await page.goto(base + "/auth/confirm-email-change?token=change-valid");
  await expect(page.getByRole("button", { name: "Confirmar correo", exact: true })).toBeEnabled();
  assert.equal(changeConfirmWrites, 0);
  await page.getByRole("button", { name: "Confirmar correo", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("El nuevo correo fue verificado");
  await page.goto(base + "/mi-cuenta");
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toHaveValue(
    "nuevo@example.com",
  );
  await expect(page.getByLabel("NIT", { exact: true })).toHaveValue("1234567");
  assert.equal(user.customerId, 7001);
  assert.equal(changeConfirmWrites, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/identity-profile-mobile.png", fullPage: true });
  assert.deepEqual(failures, []);
  await context.close();
  process.stdout.write(
    "PASS SOLO_CONTRATO: registro con verificación, GET sin efecto, enlaces vencidos, reenvío genérico, A2F por desafío sin reenviar contraseña, cookie HttpOnly, cambio de correo pendiente, NIT permanente y móvil.\n",
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

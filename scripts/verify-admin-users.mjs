import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
const require = createRequire(import.meta.url);
const host = "127.0.0.1",
  appPort = 3250,
  apiPort = 3251;
const base = `http://localhost:${appPort}`;
const temporaryConfig = ".next-users-check.tsconfig.json";
const admin = {
  id: 1,
  name: "Ana",
  lastName: "Sistema",
  email: "admin@example.com",
  role: { id: 1, name: "ADMIN" },
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: false,
  branchIds: [],
};
const branchAdmin = (id, name, branchIds = []) => ({
  ...admin,
  id,
  name,
  lastName: "Administrador",
  email: `${name.toLowerCase()}@example.com`,
  role: { id: 3, name: "SUCURSAL_ADMIN" },
  branchIds,
});
const users = [
  admin,
  branchAdmin(90, "Rosa", [2, 3]),
  branchAdmin(89, "Luis"),
  branchAdmin(88, "Eva"),
  ...Array.from({ length: 12 }, (_, index) => ({
    ...admin,
    id: index + 5,
    name: `Cliente ${index}`,
    email: `cliente${index}@example.com`,
    role: { id: 2, name: "CUSTOMER" },
  })),
];
const tokens = new Map([
  ["users-admin", admin],
  ["users-branch-admin", users[1]],
  ["users-customer", users[4]],
]);
const catalog = [
  { id: 2, name: "Central" },
  { id: 3, name: "Norte" },
  { id: 4, name: "Sur" },
];
let listFailure = true,
  assignmentAttempts = 0,
  assignmentWrites = 0,
  creationWrites = 0;
const api = http.createServer(async (request, response) => {
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  const current = tokens.get(request.headers.authorization?.replace(/^Bearer /, ""));
  if (!current) return send({}, 401);
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/v1/users/profile") return send(current);
  if (current.role.name !== "ADMIN") return send({}, 403);
  if (url.pathname === "/api/v1/roles")
    return send([
      { id: 1, name: "ADMIN" },
      { id: 2, name: "CUSTOMER" },
      { id: 3, name: "SUCURSAL_ADMIN" },
      { id: 5, name: "CAJERO" },
    ]);
  if (url.pathname === "/api/v1/branches") return send(catalog);
  if (url.pathname === "/api/v1/users" && request.method === "GET") {
    if (listFailure) return send({}, 503);
    assert.equal(url.searchParams.get("size"), "10");
    assert.equal(url.searchParams.get("sortBy"), "id");
    assert.equal(url.searchParams.get("ascending"), "false");
    const page = Number(url.searchParams.get("page")),
      size = Number(url.searchParams.get("size"));
    const filtered = users
      .filter((user) => user.email.includes(url.searchParams.get("email") ?? ""))
      .sort((a, b) => b.id - a.id);
    return send({
      content: filtered.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    });
  }
  const match = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/branches$/);
  if (match) return send(users.find((user) => user.id === Number(match[1]))?.branchIds ?? []);
  if (url.pathname === "/api/v1/users/branch-administrators" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    assert.deepEqual(Object.keys(input).sort(), ["branchId", "userId"]);
    assignmentAttempts++;
    const user = users.find((user) => user.id === input.userId);
    if (!user || user.role.name !== "SUCURSAL_ADMIN")
      return send({ detail: "El usuario no es administrador de sucursales" }, 400);
    // Replica la restricción del servicio actual: no permite otra sucursal si ya tiene una.
    if (user.branchIds.length)
      return send({ detail: "El usuario ya tiene una sucursal asignada" }, 409);
    assert.ok(catalog.some((branch) => branch.id === input.branchId));
    await new Promise((resolve) => setTimeout(resolve, 350));
    user.branchIds.push(input.branchId);
    assignmentWrites++;
    if (input.userId === 88) return send({}, 503);
    response.writeHead(204);
    response.end();
    return;
  }
  if (url.pathname === "/api/v1/users" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    const created = {
      ...admin,
      id: 101,
      name: input.person.name,
      lastName: input.person.lastName,
      email: input.email,
      role: { id: input.roleId, name: "CUSTOMER" },
      branchIds: [],
    };
    users.push(created);
    creationWrites++;
    return send(created, 201);
  }
  return send({}, 404);
});
let app,
  web,
  browser,
  ownsConfig = false;
try {
  if (fs.existsSync(temporaryConfig))
    throw new Error("Ya existe la configuración temporal de usuarios.");
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
  config.distDir = ".next-users-check";
  config.typescript = { ...config.typescript, tsconfigPath: temporaryConfig };
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  app = next({
    dev: true,
    dir: process.cwd(),
    hostname: host,
    port: appPort,
    conf: { distDir: ".next-users-check", typescript: { tsconfigPath: temporaryConfig } },
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
  await anonPage.goto(base + "/system-admin/users");
  await expect(anonPage).toHaveURL(base + "/login");
  assert.equal((await anonymous.request.get(base + "/api/admin/users")).status(), 401);
  await anonymous.close();
  for (const token of ["users-branch-admin", "users-customer"]) {
    const restricted = await browser.newContext();
    await restricted.addCookies([{ name: "access_token", value: token, url: base }]);
    assert.equal((await restricted.request.get(base + "/system-admin/users")).status(), 404);
    assert.equal((await restricted.request.get(base + "/system-admin/users/new")).status(), 404);
    assert.equal((await restricted.request.get(base + "/api/admin/users")).status(), 403);
    assert.equal(
      (await restricted.request.get(base + "/api/admin/users/89/branches")).status(),
      403,
    );
    assert.equal(
      (
        await restricted.request.post(base + "/api/admin/users/89/branches", {
          headers: { Origin: base },
          data: { branchId: 2 },
        })
      ).status(),
      403,
    );
    await restricted.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "access_token", value: "users-admin", url: base }]);
  const page = await context.newPage();
  await page.goto(base + "/system-admin/users");
  await expect(
    page.getByRole("heading", { name: "Usuarios del sistema", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "servicio de usuarios" })).toBeVisible();
  listFailure = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByText("Página 1 de 2 · 16 usuarios", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 de 2 · 16 usuarios", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "admin@example.com", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await page.getByLabel("Buscar por correo", { exact: true }).fill("no-existe");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByText("No hay usuarios que coincidan con ese correo.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await page
    .getByRole("button", { name: "Gestionar sucursales de rosa@example.com", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sucursales del administrador", exact: true });
  await expect(
    dialog.getByRole("region", { name: "Sucursales asignadas", exact: true }),
  ).toContainText("Central");
  await expect(
    dialog.getByRole("region", { name: "Sucursales asignadas", exact: true }),
  ).toContainText("Norte");
  await expect(dialog.getByRole("option", { name: "Central", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Gestionar sucursales de luis@example.com", exact: true })
    .click();
  await expect(
    dialog.getByText("Este administrador no tiene sucursales asignadas.", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Sucursal para asignar", { exact: true }).selectOption("2");
  await dialog.getByRole("button", { name: "Asignar sucursal", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(dialog.getByRole("button", { name: "Asignando…", exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole("status").filter({ hasText: "Central fue asignada" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("region", { name: "Sucursales asignadas", exact: true }),
  ).toContainText("Central");
  assert.equal(assignmentAttempts, 1);
  assert.equal(assignmentWrites, 1);
  await dialog.getByLabel("Sucursal para asignar", { exact: true }).selectOption("3");
  await dialog.getByRole("button", { name: "Asignar sucursal", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "El usuario ya tiene una sucursal asignada",
  );
  assert.equal(assignmentAttempts, 2);
  assert.equal(assignmentWrites, 1);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.reload();
  const luis = page.getByRole("row").filter({ hasText: "luis@example.com" });
  await expect(luis.getByRole("button")).toHaveText("Sucursales (1)");
  await page
    .getByRole("button", { name: "Gestionar sucursales de eva@example.com", exact: true })
    .click();
  await dialog.getByLabel("Sucursal para asignar", { exact: true }).selectOption("3");
  await dialog.getByRole("button", { name: "Asignar sucursal", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("podría haberse registrado");
  await expect(
    dialog.getByRole("button", { name: "Asignar sucursal", exact: true }),
  ).toBeDisabled();
  assert.equal(assignmentAttempts, 3);
  assert.equal(assignmentWrites, 2);
  await dialog.getByRole("button", { name: "Actualizar sucursales", exact: true }).click();
  await expect(
    dialog.getByRole("region", { name: "Sucursales asignadas", exact: true }),
  ).toContainText("Norte");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/admin-user-branches-mobile.png", fullPage: true });
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "test-results/admin-users-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Crear usuario", exact: true }).click();
  await expect(page).toHaveURL(base + "/system-admin/users/new");
  for (const [label, value] of [
    ["Nombre", "Nuevo"],
    ["Apellido", "Cliente"],
    ["DPI", "1234567890123"],
    ["NIT", "1234567"],
    ["Teléfono", "55555555"],
    ["Dirección", "Centro"],
    ["Correo electrónico", "nuevo@example.com"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Rol del usuario", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Usuario creado", exact: true })).toBeVisible();
  assert.equal(creationWrites, 1);
  await page.getByRole("link", { name: "Ver usuarios y asignar sucursales", exact: true }).click();
  await expect(page.getByRole("cell", { name: "nuevo@example.com", exact: true })).toBeVisible();
  await context.close();
  process.stdout.write(
    "PASS: listado paginado, búsqueda, permisos exclusivos de ADMIN, creación de usuarios, sucursales asignadas, asignación única con doble clic, errores de la API sin cambios en backend, resultado incierto sin reenvío y móvil.\n",
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

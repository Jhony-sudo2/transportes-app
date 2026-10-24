import { test, expect } from "@playwright/test";
test("login pide codigo, permite reenviarlo y muestra errores del servicio", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    const data = route.request().postDataJSON() as { code?: string };
    await route.fulfill({
      status: data.code ? 401 : 200,
      json: data.code ? { detail: "Codigo incorrecto" } : { status: "two_factor_required" },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verifica tu correo" })).toBeVisible();
  await page.getByRole("button", { name: "Reenviar código" }).click();
  await expect(page.getByRole("status")).toContainText("Se solicitó un nuevo código");
  await page.getByLabel("Código de verificación").fill("1234");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Codigo incorrecto");
});
test("solicita enlace de recuperacion", async ({ page }) => {
  await page.route("**/api/auth/recovery/forgot", (route) =>
    route.fulfill({ json: { status: "sent", detail: "Revisa tu correo" } }),
  );
  await page.goto("/login");
  await page.getByRole("link", { name: "Olvidé mi contraseña" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Olvidaste tu contraseña?", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toHaveText("Revisa tu correo");
});
test("usa el token del correo sin conservarlo en la URL y confirma el cambio", async ({ page }) => {
  await page.route("**/api/auth/recovery/reset", async (route) => {
    const data = route.request().postDataJSON() as { token: string; password: string };
    expect(data.token).toBe("header.payload.signature");
    expect(data.password).toBe("nueva123");
    await route.fulfill({ json: { status: "reset", detail: "Contraseña actualizada" } });
  });
  await page.goto("/auth/reset-password?token=header.payload.signature");
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("nueva123");
  await page.getByLabel("Confirmar contraseña").fill("nueva123");
  await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await expect(page.getByRole("status")).toHaveText("Contraseña actualizada");
});
test("registro conserva formularios y diseño móvil sin desbordamiento", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/transport-register-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.screenshot({ path: "test-results/transport-login-desktop.png", fullPage: true });
});

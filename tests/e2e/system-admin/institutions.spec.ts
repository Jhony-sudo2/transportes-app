// System admin: institution management (US-010)
import { test, expect } from "@playwright/test";
import { loginAsSystemAdminAndWait, loginAsParticipantAndWait } from "../helpers/auth";

const INSTITUTION_WITH_CONGRESS_ID = "30000000-0000-0000-0000-000000000001"; // has congresses

test.describe("Institutions page — render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/institutions");
    await expect(page.getByTestId("system-admin-institutions-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("institutions list is visible", async ({ page }) => {
    await expect(page.getByTestId("institutions-list")).toBeVisible({ timeout: 8000 });
  });

  test("create institution button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nueva institucion|agregar institucion/i }),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Create institution", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/institutions");
    await expect(page.getByTestId("system-admin-institutions-page")).toBeVisible({ timeout: 10000 });
  });

  test("create institution dialog opens", async ({ page }) => {
    await page.getByRole("button", { name: /nueva institucion|agregar institucion/i }).click();
    await expect(page.getByTestId("institution-form-dialog")).toBeVisible();
  });

  test("institution form has name, description, and email fields", async ({ page }) => {
    await page.getByRole("button", { name: /nueva institucion|agregar institucion/i }).click();
    await expect(page.getByTestId("institution-name-input")).toBeVisible();
    await expect(page.getByTestId("institution-description-input")).toBeVisible();
    await expect(page.getByTestId("institution-email-input")).toBeVisible();
  });

  test("shows error for invalid contact email", async ({ page }) => {
    await page.getByRole("button", { name: /nueva institucion|agregar institucion/i }).click();
    await page.getByTestId("institution-name-input").fill("Test Uni");
    await page.getByTestId("institution-description-input").fill("Descripcion");
    await page.getByTestId("institution-email-input").fill("not-an-email");
    await page.getByTestId("institution-submit-button").click();
    await expect(page.getByTestId("institution-email-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows error for empty name", async ({ page }) => {
    await page.getByRole("button", { name: /nueva institucion|agregar institucion/i }).click();
    await page.getByTestId("institution-submit-button").click();
    await expect(page.getByTestId("institution-name-error")).toBeVisible({ timeout: 5000 });
  });

  test("can fill a valid create institution form", async ({ page }) => {
    await page.getByRole("button", { name: /nueva institucion|agregar institucion/i }).click();
    await page.getByTestId("institution-name-input").fill("Universidad Test E2E");
    await page.getByTestId("institution-description-input").fill("Institucion de prueba");
    await page.getByTestId("institution-email-input").fill("test@universidad.edu.gt");
    await expect(page.getByTestId("institution-submit-button")).toBeEnabled();
  });
});

test.describe("Delete institution — conflict guard", () => {
  test("deleting institution with congresses returns 409 from API", async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    const response = await page.request.delete(`/api/institutions/${INSTITUTION_WITH_CONGRESS_ID}`);
    expect(response.status()).toBe(409);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("resource.conflict");
  });
});

test.describe("Institution API — auth gates", () => {
  test("POST /api/institutions returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.post("/api/institutions", {
      data: { name: "Test", description: "Desc", contactEmail: "test@test.com" },
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/institutions/{id} returns 401 for unauthenticated request", async ({
    page,
  }) => {
    const response = await page.request.delete(`/api/institutions/${INSTITUTION_WITH_CONGRESS_ID}`);
    expect(response.status()).toBe(401);
  });

  test("participant cannot access institutions admin page", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/system-admin/institutions");
    // Should redirect away from system-admin area
    await expect(page).not.toHaveURL(/\/system-admin\/institutions/, { timeout: 5000 });
  });
});

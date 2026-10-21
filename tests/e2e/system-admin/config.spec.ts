// System admin: commission configuration (US-058)
import { test, expect } from "@playwright/test";
import { loginAsSystemAdminAndWait, loginAsParticipantAndWait } from "../helpers/auth";

test.describe("System config page — commission (US-058)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/config");
    await expect(page.getByTestId("system-admin-config-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("config page renders with commission form", async ({ page }) => {
    await expect(page.getByTestId("commission-form")).toBeVisible({ timeout: 8000 });
  });

  test("commission input is visible and pre-filled with current value", async ({ page }) => {
    const input = page.getByTestId("commission-percent-input");
    await expect(input).toBeVisible({ timeout: 8000 });
    // Mock data should have a numeric value
    const value = await input.inputValue();
    expect(Number(value)).toBeGreaterThanOrEqual(0);
  });

  test("save button is visible", async ({ page }) => {
    await expect(page.getByTestId("commission-submit-button")).toBeVisible({ timeout: 8000 });
  });

  test("shows validation error when commission > 100", async ({ page }) => {
    await page.getByTestId("commission-percent-input").fill("101");
    await page.getByTestId("commission-submit-button").click();
    await expect(page.getByTestId("commission-percent-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error when commission < 0", async ({ page }) => {
    await page.getByTestId("commission-percent-input").fill("-1");
    await page.getByTestId("commission-submit-button").click();
    await expect(page.getByTestId("commission-percent-error")).toBeVisible({ timeout: 5000 });
  });

  test("accepts commission = 0 (no commission)", async ({ page }) => {
    await page.getByTestId("commission-percent-input").fill("0");
    await expect(page.getByTestId("commission-submit-button")).toBeEnabled();
  });

  test("accepts commission = 100 (full commission)", async ({ page }) => {
    await page.getByTestId("commission-percent-input").fill("100");
    await expect(page.getByTestId("commission-submit-button")).toBeEnabled();
  });
});

test.describe("System config API — auth gates", () => {
  test("GET /api/system/config returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.get("/api/system/config");
    expect(response.status()).toBe(401);
  });

  test("PUT /api/system/config returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.put("/api/system/config", {
      data: { commissionPercent: 10 },
    });
    expect(response.status()).toBe(401);
  });

  test("participant cannot access system config page", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/system-admin/config");
    await expect(page).not.toHaveURL(/\/system-admin\/config/, { timeout: 5000 });
  });

  test("GET /api/system/config returns valid config for system admin", async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    const response = await page.request.get("/api/system/config");
    expect(response.status()).toBe(200);
    const body = await response.json() as { commissionPercent?: number };
    expect(typeof body.commissionPercent).toBe("number");
    expect(body.commissionPercent).toBeGreaterThanOrEqual(0);
    expect(body.commissionPercent).toBeLessThanOrEqual(100);
  });
});

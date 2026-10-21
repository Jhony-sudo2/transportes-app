// CongressAdmin: guest speaker management (US-008)
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait, loginAsParticipantAndWait } from "../helpers/auth";

test.describe("Guest speakers page — render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/guest-speakers");
    await expect(page.getByTestId("congress-admin-guest-speakers-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("guest speakers page renders for congress admin", async ({ page }) => {
    await expect(page.getByTestId("congress-admin-guest-speakers-page")).toBeVisible();
  });

  test("speakers list or empty state is visible", async ({ page }) => {
    const hasList = await page.getByTestId("guest-speakers-list").isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId("guest-speakers-empty").isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  test("create guest speaker button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Create guest speaker (US-008)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/guest-speakers");
    await expect(page.getByTestId("congress-admin-guest-speakers-page")).toBeVisible({ timeout: 10000 });
  });

  test("create guest speaker dialog opens", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await expect(page.getByTestId("create-guest-speaker-dialog")).toBeVisible();
  });

  test("form has all required fields", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await expect(page.getByTestId("guest-speaker-fullname-input")).toBeVisible();
    await expect(page.getByTestId("guest-speaker-email-input")).toBeVisible();
    await expect(page.getByTestId("guest-speaker-organization-input")).toBeVisible();
    await expect(page.getByTestId("guest-speaker-phone-input")).toBeVisible();
    await expect(page.getByTestId("guest-speaker-personal-id-input")).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await page.getByTestId("guest-speaker-email-input").fill("not-an-email");
    await page.getByTestId("guest-speaker-submit-button").click();
    await expect(page.getByTestId("guest-speaker-email-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error for personalId with special characters", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await page.getByTestId("guest-speaker-personal-id-input").fill("EXT-2024!");
    await page.getByTestId("guest-speaker-submit-button").click();
    await expect(page.getByTestId("guest-speaker-personal-id-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation errors for all empty fields on submit", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await page.getByTestId("guest-speaker-submit-button").click();
    await expect(page.getByTestId("guest-speaker-fullname-error")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("guest-speaker-email-error")).toBeVisible({ timeout: 5000 });
  });

  test("can fill a valid guest speaker form", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo ponente|agregar ponente|crear ponente/i }).click();
    await page.getByTestId("guest-speaker-fullname-input").fill("Dr. Maria Lopez");
    await page.getByTestId("guest-speaker-email-input").fill("maria.lopez@mit.edu");
    await page.getByTestId("guest-speaker-organization-input").fill("MIT");
    await page.getByTestId("guest-speaker-phone-input").fill("55554321");
    await page.getByTestId("guest-speaker-personal-id-input").fill("EXTUSA2026");
    await expect(page.getByTestId("guest-speaker-submit-button")).toBeEnabled();
  });
});

test.describe("Guest speakers API — auth gates", () => {
  test("POST /api/users/guest-speakers returns 401 for unauthenticated", async ({ page }) => {
    const response = await page.request.post("/api/users/guest-speakers", {
      data: {
        fullName: "Test Ponente",
        email: "ponente@test.com",
        organization: "Org",
        phone: "55551234",
        personalId: "TEST001",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("participant cannot access guest speakers page", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/congress-admin/guest-speakers");
    await expect(page).not.toHaveURL(/\/congress-admin\/guest-speakers/, { timeout: 5000 });
  });
});

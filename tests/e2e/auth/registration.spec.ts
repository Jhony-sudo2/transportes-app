// Critical flow 1: Self-registration as participant
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Self-registration", () => {
  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("register-page")).toBeVisible();
  });

  test("register page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("register-page")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("shows validation errors when submitting empty form", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("register-full-name-error")).toBeVisible();
    await expect(page.getByTestId("register-email-error")).toBeVisible();
    await expect(page.getByTestId("register-password-error")).toBeVisible();
    await expect(page.getByTestId("register-organization-error")).toBeVisible();
    await expect(page.getByTestId("register-phone-error")).toBeVisible();
    await expect(page.getByTestId("register-personal-id-error")).toBeVisible();
  });

  test("successful registration redirects to login", async ({ page }) => {
    await page.goto("/register");

    await page.getByTestId("register-full-name").fill("Test Usuario Nuevo");
    await page.getByTestId("register-email").fill("nuevo@test.com");
    await page.getByTestId("register-password").fill("Password123!");
    await page.getByTestId("register-organization").fill("Universidad Test");
    await page.getByTestId("register-phone").fill("55551111");
    await page.getByTestId("register-personal-id").fill("TEST1234");

    await page.getByTestId("register-submit").click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("register-login-link")).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-register-link")).toBeVisible();
    await page.getByTestId("login-register-link").click();
    await expect(page).toHaveURL(/\/register/, { timeout: 8000 });
  });
});

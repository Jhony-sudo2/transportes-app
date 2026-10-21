// Critical flow 2: Login and logout
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAsParticipantAndWait, loginAsCongressAdminAndWait, loginAsSystemAdminAndWait, MOCK_USERS } from "../helpers/auth";

test.describe("Login flow", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-page")).toBeVisible();
  });

  test("login page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-page")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("login page has correct heading", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("noexiste@test.com");
    await page.getByTestId("login-password").fill("Password123!");
    await page.getByTestId("login-submit").click();
    // Error toast should appear
    await expect(page.getByText(/credenciales|invalido|error/i)).toBeVisible({
      timeout: 8000,
    });
  });

  test("participant login redirects to profile", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await expect(page).toHaveURL(/\/participant\/profile/, { timeout: 10000 });
  });

  test("congress admin login redirects to congresses", async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await expect(page).toHaveURL(/\/congress-admin\/congresses/, {
      timeout: 10000,
    });
  });

  test("system admin login redirects to users", async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await expect(page).toHaveURL(/\/system-admin\/users/, { timeout: 10000 });
  });
});

test.describe("Logout flow", () => {
  test("unauthenticated user is redirected to login from protected route", async ({
    page,
  }) => {
    await page.goto("/participant/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated participant can logout", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    // Call logout API directly (sidebar logout button)
    const response = await page.request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
  });

  test("shows validation errors on empty login form", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-email-error")).toBeVisible();
    await expect(page.getByTestId("login-password-error")).toBeVisible();
  });
});

test.describe("Inactive user", () => {
  test("inactive user cannot log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(MOCK_USERS.participant.email.replace("participante", "inactivo"));
    await page.getByTestId("login-password").fill("Password123!");
    await page.getByTestId("login-submit").click();
    // Should stay on login or show error
    await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Role-based redirect", () => {
  test("unauthenticated access to participant area redirects to /login", async ({ page }) => {
    await page.goto("/participant/wallet");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to congress-admin area redirects to /login", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to system-admin area redirects to /login", async ({ page }) => {
    await page.goto("/system-admin/users");
    await expect(page).toHaveURL(/\/login/);
  });
});

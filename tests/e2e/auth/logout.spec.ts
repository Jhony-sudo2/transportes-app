import { test, expect } from "@playwright/test";

test.describe("Logout flow", () => {
  test("unauthenticated user is redirected to login from protected route", async ({ page }) => {
    await page.goto("/participant/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout API endpoint returns 200", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
  });
});

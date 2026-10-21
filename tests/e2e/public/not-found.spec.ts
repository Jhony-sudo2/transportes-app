import { test, expect } from "@playwright/test";

test.describe("404 Not Found page", () => {
  test("renders 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });

  test('shows "Volver al inicio" link on 404 page', async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    const homeLink = page.getByTestId("not-found-home-link");
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveText("Volver al inicio");
  });

  test('"Volver al inicio" link navigates to home', async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.getByTestId("not-found-home-link").click();
    await expect(page).toHaveURL("/");
  });
});

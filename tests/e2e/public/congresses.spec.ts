// Critical flow 3: Browse and view congress detail
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MOCK_IDS } from "../helpers/auth";

test.describe("Public congresses page", () => {
  test("congresses page renders without error", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByTestId("congresses-page")).toBeVisible();
  });

  test("congresses page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByTestId("congresses-page")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("congresses page has a heading", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByRole("heading", { name: "Congresos" })).toBeVisible();
  });

  test("navbar is visible on congresses page", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByTestId("navbar")).toBeVisible();
  });

  test("congress grid renders cards", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByTestId("congress-grid")).toBeVisible();
    const cards = page.getByTestId("congress-card");
    await expect(cards.first()).toBeVisible();
  });

  test("congress card shows name and price", async ({ page }) => {
    await page.goto("/congresses");
    await expect(page.getByTestId("congress-card-name").first()).toBeVisible();
    await expect(page.getByTestId("congress-card-price").first()).toBeVisible();
  });

  test("clicking a congress card navigates to detail page", async ({
    page,
  }) => {
    await page.goto("/congresses");
    await page.getByTestId("congress-card-detail-link").first().click();
    await expect(page.getByTestId("congress-detail-page")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Congress detail page", () => {
  test("congress detail page renders for known congress", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress1}`);
    await expect(page.getByTestId("congress-detail-page")).toBeVisible();
  });

  test("congress detail shows hero section", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress1}`);
    await expect(page.getByTestId("congress-hero")).toBeVisible();
  });

  test("congress detail shows activities list", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress1}`);
    await expect(page.getByTestId("activities-list")).toBeVisible();
    await expect(page.getByTestId("activity-item").first()).toBeVisible();
  });

  test("activity items show PONENCIA or TALLER badge", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress1}`);
    // At least one activity badge should be visible
    const badgePonencia = page.getByTestId("activity-badge-PONENCIA");
    const badgeTaller = page.getByTestId("activity-badge-TALLER");
    const hasBadge =
      (await badgePonencia.count()) > 0 || (await badgeTaller.count()) > 0;
    expect(hasBadge).toBe(true);
  });

  test("enroll button is visible on congress detail", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress1}`);
    await expect(page.getByTestId("enroll-button")).toBeVisible();
  });
});

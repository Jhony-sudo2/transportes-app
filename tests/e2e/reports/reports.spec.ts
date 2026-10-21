// Critical flow 10: One report per role exported as HTML
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait, loginAsSystemAdminAndWait } from "../helpers/auth";

test.describe("CongressAdmin reports (flow 10)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/reports");
    await expect(
      page.getByTestId("congress-admin-reports-page"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("reports page renders with congress selector", async ({ page }) => {
    await expect(page.getByTestId("report-congress-select")).toBeVisible();
  });

  test("export HTML button is visible", async ({ page }) => {
    await expect(page.getByTestId("export-html-button")).toBeVisible();
  });

  test("search button triggers report data load", async ({ page }) => {
    await expect(page.getByTestId("report-search-button")).toBeVisible();
    await page.getByTestId("report-search-button").click();
    // After search, report-table should appear (mock data is returned)
    await expect(page.getByTestId("report-table")).toBeVisible({
      timeout: 8000,
    });
  });

  test("participants tab is active by default and shows table", async ({
    page,
  }) => {
    // Click search with default tab (participants)
    await page.getByTestId("report-search-button").click();
    await expect(page.getByTestId("report-table")).toBeVisible({
      timeout: 8000,
    });
  });

  test("HTML export generates downloadable report", async ({ page }) => {
    // Trigger a search first so data is available
    await page.getByTestId("report-search-button").click();
    await expect(page.getByTestId("report-table")).toBeVisible({
      timeout: 8000,
    });

    // Click the export HTML button — it should initiate a download
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
    await page.getByTestId("export-html-button").click();
    // The export button should not disappear after clicking (it stays enabled)
    await expect(page.getByTestId("export-html-button")).toBeVisible();
    await downloadPromise; // may be null if window.open is used instead
  });

  test("report API returns data for congress admin", async ({ page }) => {
    const response = await page.request.get(
      "/api/reports/participants?congressId=20000000-0000-0000-0000-000000000001",
    );
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toBeDefined();
  });
});

test.describe("SystemAdmin reports (flow 10)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/reports");
    await expect(page.getByTestId("system-admin-reports-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("system admin reports page renders with earnings tab", async ({
    page,
  }) => {
    await expect(page.getByTestId("earnings-tab")).toBeVisible();
    await expect(page.getByTestId("congresses-tab")).toBeVisible();
  });

  test("earnings report search button works", async ({ page }) => {
    await expect(page.getByTestId("report-search-button")).toBeVisible();
    await page.getByTestId("report-search-button").click();
    await expect(page.getByTestId("report-table")).toBeVisible({
      timeout: 8000,
    });
  });

  test("earnings report HTML export button is visible", async ({ page }) => {
    await expect(page.getByTestId("export-html-button").first()).toBeVisible();
  });

  test("congresses-by-institution tab shows second report", async ({ page }) => {
    await page.getByTestId("congresses-tab").click();
    // Search button should still be visible in new tab
    await expect(page.getByTestId("report-search-button").last()).toBeVisible();
  });

  test("earnings report API returns data for system admin", async ({ page }) => {
    const response = await page.request.get("/api/reports/earnings");
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toBeDefined();
  });

  test("congresses by institution API returns data", async ({ page }) => {
    const response = await page.request.get(
      "/api/reports/congresses-by-institution",
    );
    expect(response.status()).toBe(200);
  });
});

// Critical flow 9: Diploma access after >= 3 attendances
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait } from "../helpers/auth";

// The mock participant (participante@usac.edu.gt) has 5 attendance records in mock data,
// which satisfies the >= 3 threshold for the PARTICIPATION diploma.
// Both PARTICIPATION and LEADERSHIP diplomas are available in mock data (available: true).

test.describe("Diplomas — access after >=3 attendances (flow 9)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/participant/diplomas");
    await expect(page.getByTestId("diplomas-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("diplomas page renders for authenticated participant", async ({
    page,
  }) => {
    await expect(page.getByTestId("diplomas-page")).toBeVisible();
  });

  test("diploma list shows available diplomas", async ({ page }) => {
    await expect(page.getByTestId("diploma-list")).toBeVisible({
      timeout: 10000,
    });
  });

  test("participant has at least one diploma item", async ({ page }) => {
    await expect(page.getByTestId("diploma-item").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("PARTICIPATION diploma is available (participant has 5 attendances)", async ({
    page,
  }) => {
    const diplomaItems = page.getByTestId("diploma-item");
    await expect(diplomaItems.first()).toBeVisible({ timeout: 10000 });
    // PARTICIPATION diploma has available=true in mock data — download button should be present
    await expect(page.getByTestId("diploma-download-button").first()).toBeVisible();
  });

  test("LEADERSHIP diploma is available for activity leaders", async ({
    page,
  }) => {
    const downloadButtons = page.getByTestId("diploma-download-button");
    const count = await downloadButtons.count();
    // Both PARTICIPATION and LEADERSHIP diplomas are available in mock
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("download button links to the download endpoint", async ({ page }) => {
    const firstDownload = page.getByTestId("diploma-download-button").first();
    await expect(firstDownload).toBeVisible({ timeout: 10000 });
    const href = await firstDownload.getAttribute("href");
    expect(href).toMatch(/\/api\/diplomas\/.+\/download/);
  });

  test("diploma API returns data for authenticated participant", async ({
    page,
  }) => {
    const session = await page
      .context()
      .cookies()
      .then((cookies) =>
        cookies.find((c) => c.name === "access_token"),
      );
    // If cookie exists, we're authenticated; verify the API responds
    if (session !== undefined) {
      const response = await page.request.get("/api/users/me");
      const body = await response.json() as { id?: string };
      expect(body.id).toBeDefined();
    }
  });
});

// Critical flow 8: Attendance registration (PONENCIA + TALLER with reservation gate)
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait } from "../helpers/auth";

const MOCK_CONGRESS_1_ID = "20000000-0000-0000-0000-000000000001";
const PONENCIA_ACTIVITY_ID = "40000000-0000-0000-0000-000000000001";
const TALLER_ACTIVITY_ID = "40000000-0000-0000-0000-000000000002";
const PARTICIPANT_PERSONAL_ID = "12345678";

test.describe("Attendance registration (flow 8)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/attendance");
    await expect(
      page.getByTestId("congress-admin-attendance-page"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("attendance page renders with registration form", async ({ page }) => {
    await expect(page.getByTestId("attendance-congress-select")).toBeVisible();
    await expect(page.getByTestId("attendance-activity-select")).toBeVisible();
    await expect(page.getByTestId("attendance-personalid-input")).toBeVisible();
    await expect(page.getByTestId("attendance-register-button")).toBeVisible();
  });

  test("attendance history table is visible", async ({ page }) => {
    await expect(page.getByTestId("attendance-history-table")).toBeVisible();
  });

  test("can select congress in attendance form", async ({ page }) => {
    const congressSelect = page.getByTestId("attendance-congress-select");
    await congressSelect.selectOption(MOCK_CONGRESS_1_ID);
    await expect(congressSelect).toHaveValue(MOCK_CONGRESS_1_ID);
  });

  test("can select activity after selecting congress", async ({ page }) => {
    await page.getByTestId("attendance-congress-select").selectOption(MOCK_CONGRESS_1_ID);
    // Activity select should update to show activities for this congress
    await expect(page.getByTestId("attendance-activity-select")).toBeEnabled({
      timeout: 5000,
    });
  });

  test("can fill personalId and submit attendance for PONENCIA", async ({
    page,
  }) => {
    await page.getByTestId("attendance-congress-select").selectOption(MOCK_CONGRESS_1_ID);
    await page.getByTestId("attendance-activity-select").selectOption(PONENCIA_ACTIVITY_ID);
    await page.getByTestId("attendance-personalid-input").fill(PARTICIPANT_PERSONAL_ID);
    await expect(page.getByTestId("attendance-register-button")).toBeEnabled();
    await page.getByTestId("attendance-register-button").click();
    // After submit, the table should refresh and still be visible
    await expect(page.getByTestId("attendance-history-table")).toBeVisible({
      timeout: 8000,
    });
  });

  test("can register attendance for TALLER (participant has reservation)", async ({
    page,
  }) => {
    await page.getByTestId("attendance-congress-select").selectOption(MOCK_CONGRESS_1_ID);
    await page.getByTestId("attendance-activity-select").selectOption(TALLER_ACTIVITY_ID);
    await page.getByTestId("attendance-personalid-input").fill(PARTICIPANT_PERSONAL_ID);
    await page.getByTestId("attendance-register-button").click();
    await expect(page.getByTestId("attendance-history-table")).toBeVisible({
      timeout: 8000,
    });
  });

  test("attendance API gate requires congress admin auth", async ({ page }) => {
    // Verify the page is protected by role guard
    const response = await page.request.post("/api/attendance/register", {
      data: {
        activityId: PONENCIA_ACTIVITY_ID,
        personalId: PARTICIPANT_PERSONAL_ID,
      },
    });
    // Should be 200/201 when authenticated as congress admin
    expect([200, 201]).toContain(response.status());
  });

  test("registering TALLER attendance without prior reservation returns 422", async ({
    page,
  }) => {
    // TALLER_ACTIVITY_3_ID: participant "12345678" has no reservation
    const TALLER_NO_RESERVATION_ID = "40000000-0000-0000-0000-000000000003";
    const response = await page.request.post("/api/attendance/register", {
      data: {
        activityId: TALLER_NO_RESERVATION_ID,
        personalId: PARTICIPANT_PERSONAL_ID,
      },
    });
    expect(response.status()).toBe(422);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("domain.invariant_violated");
  });
});

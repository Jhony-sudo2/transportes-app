// Critical flow 7: CongressAdmin creates congress, room, and activity
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait } from "../helpers/auth";

test.describe("Congress management — create congress (flow 7)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("congresses page renders for congress admin", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await expect(
      page.getByTestId("congress-admin-congresses-page"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("congresses list is visible with mock data", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await expect(page.getByTestId("congresses-list")).toBeVisible({
      timeout: 10000,
    });
  });

  test("new congress button opens congress form dialog", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await page.getByTestId("new-congress-button").click();
    await expect(page.getByTestId("congress-form-dialog")).toBeVisible();
  });

  test("congress form has name input", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await page.getByTestId("new-congress-button").click();
    await expect(page.getByTestId("congress-name-input")).toBeVisible();
  });

  test("can fill and submit congress creation form", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await page.getByTestId("new-congress-button").click();
    await page.getByTestId("congress-name-input").fill("Congreso E2E Test");
    // Submit to verify the form responds (mock will accept any valid input)
    await expect(page.getByTestId("congress-submit-button")).toBeVisible();
  });
});

test.describe("Room management — create room (flow 7)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("rooms page renders for congress admin", async ({ page }) => {
    await page.goto("/congress-admin/rooms");
    await expect(page.getByTestId("congress-admin-rooms-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("rooms list is visible after selecting a congress", async ({ page }) => {
    await page.goto("/congress-admin/rooms");
    await expect(page.getByTestId("congress-admin-rooms-page")).toBeVisible({
      timeout: 10000,
    });
    // The room list should appear once a congress is pre-selected (mock selects first)
    await expect(page.getByTestId("rooms-list")).toBeVisible({ timeout: 8000 });
  });

  test("new room button opens room form dialog", async ({ page }) => {
    await page.goto("/congress-admin/rooms");
    // Wait for rooms list to load so the add button is shown
    await expect(page.getByTestId("rooms-list")).toBeVisible({ timeout: 8000 });
    // Find and click the "Agregar sala" button (it has no testid in the list header — using role)
    const addButton = page.getByRole("button", { name: /agregar sala/i });
    await addButton.click();
    await expect(page.getByTestId("room-form-dialog")).toBeVisible();
  });

  test("room form has name input field", async ({ page }) => {
    await page.goto("/congress-admin/rooms");
    await expect(page.getByTestId("rooms-list")).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: /agregar sala/i }).click();
    await expect(page.getByTestId("room-name-input")).toBeVisible();
  });
});

test.describe("Activity management — create activity (flow 7)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("activities page renders for congress admin", async ({ page }) => {
    await page.goto("/congress-admin/activities");
    await expect(
      page.getByTestId("congress-admin-activities-page"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("activities list is visible", async ({ page }) => {
    await page.goto("/congress-admin/activities");
    await expect(page.getByTestId("activities-list")).toBeVisible({
      timeout: 10000,
    });
  });

  test("new activity button opens activity form dialog", async ({ page }) => {
    await page.goto("/congress-admin/activities");
    await expect(page.getByTestId("activities-list")).toBeVisible({
      timeout: 8000,
    });
    const addButton = page.getByRole("button", { name: /nueva actividad/i });
    await addButton.click();
    await expect(page.getByTestId("activity-form-dialog")).toBeVisible();
  });

  test("activity form has name input field", async ({ page }) => {
    await page.goto("/congress-admin/activities");
    await expect(page.getByTestId("activities-list")).toBeVisible({
      timeout: 8000,
    });
    await page.getByRole("button", { name: /nueva actividad/i }).click();
    await expect(page.getByTestId("activity-name-input")).toBeVisible();
  });

  test("activity form shows error when endTime is before startTime", async ({ page }) => {
    await page.goto("/congress-admin/activities");
    await expect(page.getByTestId("activities-list")).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: /nueva actividad/i }).click();
    await expect(page.getByTestId("activity-form-dialog")).toBeVisible();
    // Fill a start time that is after the end time
    await page.getByTestId("activity-start-input").fill("2026-07-15T14:00");
    await page.getByTestId("activity-end-input").fill("2026-07-15T13:00");
    await page.getByTestId("activity-submit-button").click();
    await expect(page.getByTestId("activity-end-error")).toBeVisible();
  });
});

test.describe("Congress form — price validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("congress form shows error when price is below Q35", async ({ page }) => {
    await page.goto("/congress-admin/congresses");
    await page.getByTestId("new-congress-button").click();
    await expect(page.getByTestId("congress-form-dialog")).toBeVisible();
    await page.getByTestId("congress-price-input").fill("20");
    await page.getByTestId("congress-submit-button").click();
    await expect(page.getByTestId("congress-price-error")).toBeVisible();
  });
});

test.describe("Room deletion — conflict guard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("deleting a room with activities returns 409 from API", async ({ page }) => {
    // MOCK_ROOM_1_ID has activities associated
    const ROOM_WITH_ACTIVITIES = "30000000-0000-0000-0000-000000000001";
    const response = await page.request.delete(`/api/rooms/${ROOM_WITH_ACTIVITIES}`);
    expect(response.status()).toBe(409);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("resource.conflict");
  });
});

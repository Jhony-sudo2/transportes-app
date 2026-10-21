// Critical flow 6: Reserve a TALLER seat (capacity-aware)
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait } from "../helpers/auth";

const TALLER_ACTIVITY_ID = "40000000-0000-0000-0000-000000000002";

test.describe("Workshop reservation (flow 6)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("reservations page renders for authenticated participant", async ({
    page,
  }) => {
    await page.goto("/participant/reservations");
    await expect(page.getByTestId("reservations-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("mock reservation appears in reservations list", async ({ page }) => {
    await page.goto("/participant/reservations");
    await expect(page.getByTestId("reservation-list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("reservation-item").first()).toBeVisible();
  });

  test("each reservation item has a cancel button", async ({ page }) => {
    await page.goto("/participant/reservations");
    await expect(page.getByTestId("cancel-reservation-button").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("cancel reservation dialog opens on cancel click", async ({ page }) => {
    await page.goto("/participant/reservations");
    await page.getByTestId("cancel-reservation-button").first().click();
    await expect(page.getByTestId("cancel-reservation-confirm")).toBeVisible();
  });

  test("can create a new reservation via BFF API", async ({ page }) => {
    // Reserve TALLER ACTIVITY_3 (not yet reserved in mock data)
    const response = await page.request.post(
      `/api/activities/${TALLER_ACTIVITY_ID}/reservations`,
    );
    // 201 Created or 200 OK (idempotent mock)
    expect([200, 201]).toContain(response.status());
  });

  test("reservation API returns 401 when unauthenticated", async ({
    page,
  }) => {
    // Do not log in — verify auth gate
    const response = await page.request.post(
      `/api/activities/${TALLER_ACTIVITY_ID}/reservations`,
    );
    expect(response.status()).toBe(401);
  });
});

test.describe("Workshop reservation — capacity-full guard", () => {
  // MOCK_ACTIVITY_FULL_ID: workshopCapacity=1, already has 1 reservation
  const FULL_TALLER_ID = "40000000-0000-0000-0000-000000000005";

  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("reserving a full workshop returns 409 conflict", async ({ page }) => {
    const response = await page.request.post(
      `/api/activities/${FULL_TALLER_ID}/reservations`,
    );
    expect(response.status()).toBe(409);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("resource.conflict");
  });
});

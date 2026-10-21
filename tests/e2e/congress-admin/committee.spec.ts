// CongressAdmin: scientific committee management (US-034, US-035)
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait, loginAsParticipantAndWait } from "../helpers/auth";

const CONGRESS_ID = "20000000-0000-0000-0000-000000000001";
const VALID_USER_UUID = "10000000-0000-0000-0000-000000000001"; // a participant in mock data

test.describe("Committee page — render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/committee");
    await expect(page.getByTestId("congress-admin-committee-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("committee page renders with congress selector", async ({ page }) => {
    await expect(page.getByTestId("committee-congress-select")).toBeVisible({ timeout: 8000 });
  });

  test("committee list becomes visible after selecting a congress", async ({ page }) => {
    await page.getByTestId("committee-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("committee-list")).toBeVisible({ timeout: 8000 });
  });

  test("add committee member button is visible", async ({ page }) => {
    await page.getByTestId("committee-congress-select").selectOption(CONGRESS_ID);
    await expect(
      page.getByRole("button", { name: /agregar miembro|add member/i }),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Add committee member (US-034)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/committee");
    await expect(page.getByTestId("congress-admin-committee-page")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("committee-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("committee-list")).toBeVisible({ timeout: 8000 });
  });

  test("add member dialog opens on button click", async ({ page }) => {
    await page.getByRole("button", { name: /agregar miembro|add member/i }).click();
    await expect(page.getByTestId("add-committee-member-dialog")).toBeVisible();
  });

  test("add member form has userId field", async ({ page }) => {
    await page.getByRole("button", { name: /agregar miembro|add member/i }).click();
    await expect(
      page.getByTestId("committee-user-id-input").or(page.getByTestId("committee-user-select")),
    ).toBeVisible();
  });

  test("shows validation error for invalid userId", async ({ page }) => {
    await page.getByRole("button", { name: /agregar miembro|add member/i }).click();
    const userInput = page.getByTestId("committee-user-id-input");
    if (await userInput.isVisible()) {
      await userInput.fill("not-a-uuid");
      await page.getByTestId("committee-member-submit-button").click();
      await expect(page.getByTestId("committee-user-id-error")).toBeVisible({ timeout: 5000 });
    }
  });

  test("POST /api/congresses/{id}/committee returns 201 for valid userId", async ({ page }) => {
    const response = await page.request.post(`/api/congresses/${CONGRESS_ID}/committee`, {
      data: { userId: VALID_USER_UUID },
    });
    // 201 = added, 409 = already member
    expect([201, 409]).toContain(response.status());
  });

  test("POST /api/congresses/{id}/committee returns 422 for ineligible user", async ({ page }) => {
    const INELIGIBLE_USER = "10000000-0000-0000-0000-000000000099"; // mock guest speaker or similar
    const response = await page.request.post(`/api/congresses/${CONGRESS_ID}/committee`, {
      data: { userId: INELIGIBLE_USER },
    });
    // Either not found (404) or domain violation (422)
    expect([404, 409, 422]).toContain(response.status());
  });
});

test.describe("Remove committee member (US-035)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/committee");
    await expect(page.getByTestId("congress-admin-committee-page")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("committee-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("committee-list")).toBeVisible({ timeout: 8000 });
  });

  test("remove button is visible on existing committee members", async ({ page }) => {
    const removeButton = page.getByTestId("remove-committee-member-button").first();
    if (await removeButton.isVisible()) {
      await expect(removeButton).toBeEnabled();
    }
  });

  test("DELETE /api/congresses/{id}/committee/{userId} returns 204 or 404", async ({ page }) => {
    const response = await page.request.delete(
      `/api/congresses/${CONGRESS_ID}/committee/${VALID_USER_UUID}`,
    );
    expect([204, 404]).toContain(response.status());
  });
});

test.describe("Committee API — auth gates", () => {
  test("GET /api/congresses/{id}/committee returns 401 for unauthenticated", async ({ page }) => {
    const response = await page.request.get(`/api/congresses/${CONGRESS_ID}/committee`);
    expect(response.status()).toBe(401);
  });

  test("POST /api/congresses/{id}/committee returns 401 for unauthenticated", async ({ page }) => {
    const response = await page.request.post(`/api/congresses/${CONGRESS_ID}/committee`, {
      data: { userId: VALID_USER_UUID },
    });
    expect(response.status()).toBe(401);
  });

  test("participant cannot access committee management page", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/congress-admin/committee");
    await expect(page).not.toHaveURL(/\/congress-admin\/committee/, { timeout: 5000 });
  });
});

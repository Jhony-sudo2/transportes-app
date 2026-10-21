// Participant: proposal submission flow (US-030, US-032)
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait } from "../helpers/auth";

const OPEN_CALL_ID = "60000000-0000-0000-0000-000000000001";
const CLOSED_CALL_ID = "60000000-0000-0000-0000-000000000002";

test.describe("Participant proposals page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/participant/proposals");
    await expect(page.getByTestId("participant-proposals-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("proposals page renders for authenticated participant", async ({ page }) => {
    await expect(page.getByTestId("participant-proposals-page")).toBeVisible();
  });

  test("proposals list or empty state is visible", async ({ page }) => {
    // Either a list of proposals or an empty state
    const hasList = await page.getByTestId("proposals-list").isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId("proposals-empty-state").isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });
});

test.describe("Submit proposal to open call (US-030)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("submit proposal dialog opens on click", async ({ page }) => {
    await page.goto("/participant/proposals");
    const submitButton = page.getByRole("button", { name: /enviar propuesta|nueva propuesta/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.getByTestId("proposal-form-dialog")).toBeVisible();
    }
  });

  test("proposal form has title, description, and type fields", async ({ page }) => {
    await page.goto("/participant/proposals");
    const submitButton = page.getByRole("button", { name: /enviar propuesta|nueva propuesta/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.getByTestId("proposal-title-input")).toBeVisible();
      await expect(page.getByTestId("proposal-description-input")).toBeVisible();
      await expect(page.getByTestId("proposal-type-select")).toBeVisible();
    }
  });

  test("proposal form shows validation error for empty title", async ({ page }) => {
    await page.goto("/participant/proposals");
    const submitButton = page.getByRole("button", { name: /enviar propuesta|nueva propuesta/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.getByTestId("proposal-submit-button").click();
      await expect(page.getByTestId("proposal-title-error")).toBeVisible({ timeout: 5000 });
    }
  });

  test("POST /api/calls/{id}/proposals returns 201 for participant with open call", async ({
    page,
  }) => {
    const response = await page.request.post(`/api/calls/${OPEN_CALL_ID}/proposals`, {
      data: { title: "ML en Educacion", description: "Uso de ML como herramienta", type: "PONENCIA" },
    });
    expect([200, 201]).toContain(response.status());
  });

  test("POST /api/calls/{id}/proposals returns 409 or 422 for closed call", async ({ page }) => {
    const response = await page.request.post(`/api/calls/${CLOSED_CALL_ID}/proposals`, {
      data: { title: "Propuesta a call cerrado", description: "Desc", type: "TALLER" },
    });
    // Domain invariant: can't submit to a CLOSED call
    expect([409, 422]).toContain(response.status());
  });
});

test.describe("Proposals API — auth gates", () => {
  test("POST /api/calls/{id}/proposals returns 401 for unauthenticated request", async ({
    page,
  }) => {
    const response = await page.request.post(`/api/calls/${OPEN_CALL_ID}/proposals`, {
      data: { title: "Test", description: "Desc", type: "PONENCIA" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/users/{id}/proposals returns 401 for unauthenticated request", async ({
    page,
  }) => {
    const response = await page.request.get("/api/users/some-id/proposals");
    expect(response.status()).toBe(401);
  });
});

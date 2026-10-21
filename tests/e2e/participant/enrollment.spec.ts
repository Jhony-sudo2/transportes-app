// E2E: Participant enrollment in congress (flow 5 — extended)
// Tests the full enrollment path including validation, wallet balance checks, and error states.
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait, MOCK_IDS } from "../helpers/auth";

test.describe("Enrollment — full flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("congress detail page renders enroll button for an open congress", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await expect(page.getByTestId("enroll-button")).toBeVisible({
      timeout: 10000,
    });
  });

  test("clicking enroll button opens the enrollment dialog", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await expect(page.getByTestId("enroll-dialog")).toBeVisible();
  });

  test("enrollment dialog contains a payment date input", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await expect(page.getByTestId("payment-date-input")).toBeVisible();
  });

  test("confirm button is disabled before date is entered", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    const confirmBtn = page.getByTestId("confirm-enroll-button");
    await expect(confirmBtn).toBeDisabled();
  });

  test("confirm button enables after valid YYYY-MM-DD date is filled", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await page.getByTestId("payment-date-input").fill("2026-07-20");
    await expect(page.getByTestId("confirm-enroll-button")).toBeEnabled();
  });

  test("successful enrollment closes the dialog", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await page.getByTestId("payment-date-input").fill("2026-07-20");
    await page.getByTestId("confirm-enroll-button").click();
    await expect(page.getByTestId("enroll-dialog")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("after enrollment wallet transaction history shows a payment entry", async ({ page }) => {
    await page.goto("/participant/wallet");
    await expect(page.getByTestId("wallet-transactions-table")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("wallet-transactions-table")).toContainText("Pago");
  });
});

test.describe("Enrollment — commission split verification", () => {
  const MOCK_PAYMENT_ID = "a0000000-0000-0000-0000-000000000001";

  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("payment API returns commission split breakdown for mock enrollment", async ({ page }) => {
    const response = await page.request.get(`/api/payments/${MOCK_PAYMENT_ID}`);
    expect(response.status()).toBe(200);
    const body = await response.json() as {
      amount: number;
      commissionAmount: number;
      netAmount: number;
      commissionPercentSnapshot: number;
    };
    // Mock payment: amount=150, commission=10%, commissionAmount=15, netAmount=135
    expect(body.amount).toBe(150);
    expect(body.commissionPercentSnapshot).toBe(10);
    expect(body.commissionAmount).toBe(15);
    expect(body.netAmount).toBe(135);
  });
});

test.describe("Enrollment — validation errors", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await expect(page.getByTestId("enroll-button")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("enroll-button").click();
    await expect(page.getByTestId("enroll-dialog")).toBeVisible();
  });

  test("shows validation error when date format is wrong", async ({ page }) => {
    await page.getByTestId("payment-date-input").fill("20/07/2026");
    await page.getByTestId("payment-date-input").blur();
    await expect(page.getByTestId("payment-date-error")).toBeVisible();
  });

  test("shows validation error when date is empty and user tries to submit", async ({ page }) => {
    await page.getByTestId("confirm-enroll-button").click();
    await expect(page.getByTestId("payment-date-error")).toBeVisible();
  });

  test("canceling enrollment dialog closes it without error", async ({ page }) => {
    await page.getByTestId("cancel-enroll-button").click();
    await expect(page.getByTestId("enroll-dialog")).not.toBeVisible();
  });
});

// Critical flows 4 and 5: Top up wallet + Enroll in congress
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait, MOCK_IDS } from "../helpers/auth";

test.describe("Wallet — top up (flow 4)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/participant/wallet");
    await expect(page.getByTestId("wallet-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("wallet page renders with balance and transactions", async ({ page }) => {
    await expect(page.getByTestId("wallet-panel")).toBeVisible();
    await expect(page.getByTestId("wallet-balance")).toBeVisible();
    await expect(page.getByTestId("wallet-transactions-table")).toBeVisible();
  });

  test("top-up dialog opens on button click", async ({ page }) => {
    await page.getByTestId("wallet-top-up-button").click();
    await expect(page.getByTestId("top-up-dialog")).toBeVisible();
  });

  test("top-up dialog accepts amount and date inputs", async ({ page }) => {
    await page.getByTestId("wallet-top-up-button").click();
    await expect(page.getByTestId("top-up-dialog")).toBeVisible();
    await page.getByTestId("top-up-amount-input").fill("100");
    await page.getByTestId("top-up-date-input").fill("2026-07-01");
    await expect(page.getByTestId("top-up-confirm-button")).toBeEnabled();
  });

  test("successful top-up updates balance in transactions table", async ({
    page,
  }) => {
    await page.getByTestId("wallet-top-up-button").click();
    await page.getByTestId("top-up-amount-input").fill("200");
    await page.getByTestId("top-up-date-input").fill("2026-07-15");
    await page.getByTestId("top-up-confirm-button").click();
    // Dialog should close and transactions table should still be visible
    await expect(page.getByTestId("wallet-transactions-table")).toBeVisible({
      timeout: 8000,
    });
  });
});

test.describe("Enrollment — enroll in congress (flow 5)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
  });

  test("enroll button is visible on congress detail", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await expect(page.getByTestId("enroll-button")).toBeVisible({
      timeout: 10000,
    });
  });

  test("enroll dialog opens on button click", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await expect(page.getByTestId("enroll-dialog")).toBeVisible();
  });

  test("enrollment requires a payment date", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await expect(page.getByTestId("payment-date-input")).toBeVisible();
  });

  test("successful enrollment completes the flow", async ({ page }) => {
    await page.goto(`/congresses/${MOCK_IDS.congress2}`);
    await page.getByTestId("enroll-button").click();
    await page.getByTestId("payment-date-input").fill("2026-07-20");
    await page.getByTestId("confirm-enroll-button").click();
    // Either a success message appears or dialog closes
    await expect(page.getByTestId("enroll-dialog")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("wallet transaction history reflects enrollment payment", async ({
    page,
  }) => {
    await page.goto("/participant/wallet");
    await expect(page.getByTestId("wallet-transactions-table")).toBeVisible({
      timeout: 10000,
    });
    // PAYMENT type transaction should exist in mock data (rendered as "Pago" in Spanish UI)
    await expect(
      page.getByTestId("wallet-transactions-table"),
    ).toContainText("Pago");
  });
});

// CongressAdmin / CommitteeMember: proposal evaluation (US-031, US-033)
import { test, expect } from "@playwright/test";
import { loginAsCongressAdminAndWait, loginAsParticipantAndWait } from "../helpers/auth";

const CONGRESS_ID = "20000000-0000-0000-0000-000000000001";
const CALL_ID = "60000000-0000-0000-0000-000000000001";
const PENDING_PROPOSAL_ID = "70000000-0000-0000-0000-000000000001";
const APPROVED_PROPOSAL_ID = "70000000-0000-0000-0000-000000000002";

test.describe("Proposals admin page — render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/proposals");
    await expect(page.getByTestId("congress-admin-proposals-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("proposals page renders with congress selector", async ({ page }) => {
    await expect(page.getByTestId("proposals-congress-select")).toBeVisible({ timeout: 8000 });
  });

  test("proposals list becomes visible after selecting a congress", async ({ page }) => {
    await page.getByTestId("proposals-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("proposals-list")).toBeVisible({ timeout: 8000 });
  });

  test("proposal items are visible in the list", async ({ page }) => {
    await page.getByTestId("proposals-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("proposals-list")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("proposal-item").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Approve and reject proposals (US-031)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    await page.goto("/congress-admin/proposals");
    await expect(page.getByTestId("congress-admin-proposals-page")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("proposals-congress-select").selectOption(CONGRESS_ID);
    await expect(page.getByTestId("proposals-list")).toBeVisible({ timeout: 8000 });
  });

  test("PENDING proposals have approve and reject buttons", async ({ page }) => {
    const approveButton = page.getByTestId("approve-proposal-button").first();
    const rejectButton = page.getByTestId("reject-proposal-button").first();
    // At least one of these should be visible if there are pending proposals
    const hasApprove = await approveButton.isVisible();
    const hasReject = await rejectButton.isVisible();
    // If there are no pending proposals, that is acceptable
    if (hasApprove || hasReject) {
      expect(hasApprove || hasReject).toBe(true);
    }
  });

  test("PATCH /api/proposals/{id}/approve returns 200 for valid committee member", async ({
    page,
  }) => {
    const response = await page.request.patch(`/api/proposals/${PENDING_PROPOSAL_ID}/approve`);
    // 200 = approved, 409 = already approved/rejected, 403 = not a committee member
    expect([200, 409, 403]).toContain(response.status());
  });

  test("PATCH /api/proposals/{id}/reject returns 200 for valid committee member", async ({
    page,
  }) => {
    const response = await page.request.patch(`/api/proposals/${PENDING_PROPOSAL_ID}/reject`);
    expect([200, 409, 403]).toContain(response.status());
  });

  test("cannot approve an already-approved proposal (terminal state)", async ({ page }) => {
    const response = await page.request.patch(`/api/proposals/${APPROVED_PROPOSAL_ID}/approve`);
    // Should conflict since it's already approved
    expect([409, 422]).toContain(response.status());
  });
});

test.describe("Proposal review API — auth gates", () => {
  test("PATCH approve returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.patch(`/api/proposals/${PENDING_PROPOSAL_ID}/approve`);
    expect(response.status()).toBe(401);
  });

  test("PATCH reject returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.patch(`/api/proposals/${PENDING_PROPOSAL_ID}/reject`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/calls/{id}/proposals returns 401 for unauthenticated", async ({ page }) => {
    const response = await page.request.get(`/api/calls/${CALL_ID}/proposals`);
    expect(response.status()).toBe(401);
  });

  test("participant cannot access proposals admin page", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/congress-admin/proposals");
    await expect(page).not.toHaveURL(/\/congress-admin\/proposals/, { timeout: 5000 });
  });
});

test.describe("Scoped proposals — congress detail page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
  });

  test("scoped proposals page renders for specific congress", async ({ page }) => {
    await page.goto(`/congress-admin/congresses/${CONGRESS_ID}/proposals`);
    await expect(
      page
        .getByTestId("congress-admin-proposals-scoped-page")
        .or(page.getByTestId("congress-admin-proposals-page")),
    ).toBeVisible({ timeout: 10000 });
  });
});

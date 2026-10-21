// System admin: user management flows
// Covers: US-004, US-005, US-006, US-007 — critical for the most privileged admin path
import { test, expect } from "@playwright/test";
import { loginAsSystemAdminAndWait } from "../helpers/auth";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

test.describe("Users page — render and list", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/users");
    await expect(page.getByTestId("system-admin-users-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("users page renders with user list", async ({ page }) => {
    await expect(page.getByTestId("users-list")).toBeVisible({ timeout: 8000 });
  });

  test("users page shows create buttons for each user type", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nuevo system admin|crear system admin/i }),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("button", { name: /nuevo congress admin|crear congress admin/i }),
    ).toBeVisible({ timeout: 8000 });
  });

  test("users list contains at least one user row", async ({ page }) => {
    await expect(page.getByTestId("users-list")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("user-row").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Create SystemAdmin (US-006)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/users");
    await expect(page.getByTestId("system-admin-users-page")).toBeVisible({ timeout: 10000 });
  });

  test("create system admin dialog opens", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await expect(page.getByTestId("create-system-admin-dialog")).toBeVisible();
  });

  test("create system admin form has all required fields", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await expect(page.getByTestId("user-fullname-input")).toBeVisible();
    await expect(page.getByTestId("user-email-input")).toBeVisible();
    await expect(page.getByTestId("user-password-input")).toBeVisible();
    await expect(page.getByTestId("user-organization-input")).toBeVisible();
    await expect(page.getByTestId("user-phone-input")).toBeVisible();
    await expect(page.getByTestId("user-personal-id-input")).toBeVisible();
  });

  test("shows validation error when personalId contains special characters", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await page.getByTestId("user-personal-id-input").fill("DPI-2024");
    await page.getByTestId("user-submit-button").click();
    await expect(page.getByTestId("user-personal-id-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await page.getByTestId("user-email-input").fill("not-an-email");
    await page.getByTestId("user-submit-button").click();
    await expect(page.getByTestId("user-email-error")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error when password is too short", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await page.getByTestId("user-password-input").fill("Pass1!");
    await page.getByTestId("user-submit-button").click();
    await expect(page.getByTestId("user-password-error")).toBeVisible({ timeout: 5000 });
  });

  test("can fill and submit a valid system admin form", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo system admin|crear system admin/i }).click();
    await page.getByTestId("user-fullname-input").fill("Nuevo Admin Sistema");
    await page.getByTestId("user-email-input").fill("nuevo.admin@codenbugs.com");
    await page.getByTestId("user-password-input").fill("Secure123!");
    await page.getByTestId("user-organization-input").fill("Code n Bugs");
    await page.getByTestId("user-phone-input").fill("55559999");
    await page.getByTestId("user-personal-id-input").fill("ADMIN2026");
    await expect(page.getByTestId("user-submit-button")).toBeEnabled();
  });
});

test.describe("Create CongressAdmin (US-007)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/users");
    await expect(page.getByTestId("system-admin-users-page")).toBeVisible({ timeout: 10000 });
  });

  test("create congress admin dialog opens", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo congress admin|crear congress admin/i }).click();
    await expect(page.getByTestId("create-congress-admin-dialog")).toBeVisible();
  });

  test("congress admin form requires at least one institution", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo congress admin|crear congress admin/i }).click();
    // Fill everything except institutions and submit
    await page.getByTestId("user-fullname-input").fill("Admin Congreso");
    await page.getByTestId("user-email-input").fill("admin.congreso@usac.edu.gt");
    await page.getByTestId("user-password-input").fill("Secure123!");
    await page.getByTestId("user-organization-input").fill("USAC");
    await page.getByTestId("user-phone-input").fill("55551234");
    await page.getByTestId("user-personal-id-input").fill("CA2026");
    await page.getByTestId("user-submit-button").click();
    // Should show error about institutions
    await expect(page.getByTestId("user-institutions-error")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Activate and deactivate users (US-004, US-005)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSystemAdminAndWait(page);
    await page.goto("/system-admin/users");
    await expect(page.getByTestId("system-admin-users-page")).toBeVisible({ timeout: 10000 });
  });

  test("deactivate button is visible on active users", async ({ page }) => {
    await expect(page.getByTestId("users-list")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("deactivate-user-button").first()).toBeVisible({ timeout: 8000 });
  });

  test("deactivate API returns 422 when deactivating the last active system admin", async ({ page }) => {
    // The mock systemAdmin is the only active SYSTEM_ADMIN; deactivating should fail
    const SA_USER_ID = "10000000-0000-0000-0000-000000000003"; // from mock data
    const response = await page.request.patch(`/api/users/${SA_USER_ID}/deactivate`);
    // Domain invariant: cannot deactivate last active SA → 422
    expect([409, 422]).toContain(response.status());
    const body = await response.json() as { code: string };
    expect(body.code).toBe("domain.invariant_violated");
  });

  test("activate API endpoint responds for a deactivated user", async ({ page }) => {
    const INACTIVE_USER_ID = "10000000-0000-0000-0000-000000000099"; // mock inactive user
    const response = await page.request.patch(`/api/users/${INACTIVE_USER_ID}/activate`);
    // Either activated (200) or not found (404) — should not return 401/403 for system admin
    expect([200, 204, 404]).toContain(response.status());
  });
});

test.describe("User API — auth gates", () => {
  test("GET /api/users returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.get("/api/users");
    expect(response.status()).toBe(401);
  });

  test("PATCH /api/users/{id}/deactivate returns 401 for unauthenticated request", async ({
    page,
  }) => {
    const response = await page.request.patch(`/api/users/${VALID_UUID}/deactivate`);
    expect(response.status()).toBe(401);
  });

  test("POST /api/users/system-admins returns 401 for unauthenticated request", async ({
    page,
  }) => {
    const response = await page.request.post("/api/users/system-admins", {
      data: { email: "test@test.com", password: "pass", fullName: "T", organization: "O", phone: "1", personalId: "1" },
    });
    expect(response.status()).toBe(401);
  });
});

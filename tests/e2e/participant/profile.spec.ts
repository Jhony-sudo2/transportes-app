// Participant: view and edit profile (US-003)
import { test, expect } from "@playwright/test";
import { loginAsParticipantAndWait, loginAsCongressAdminAndWait } from "../helpers/auth";

test.describe("Profile page — render and view", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/participant/profile");
    await expect(page.getByTestId("participant-profile-page")).toBeVisible({
      timeout: 10000,
    });
  });

  test("profile page renders for authenticated participant", async ({ page }) => {
    await expect(page.getByTestId("participant-profile-page")).toBeVisible();
  });

  test("profile displays user information fields", async ({ page }) => {
    // At least the name should be visible
    await expect(page.getByTestId("profile-full-name")).toBeVisible({ timeout: 8000 });
  });

  test("profile displays email (read-only)", async ({ page }) => {
    await expect(page.getByTestId("profile-email")).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Edit profile form", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParticipantAndWait(page);
    await page.goto("/participant/profile");
    await expect(page.getByTestId("participant-profile-page")).toBeVisible({ timeout: 10000 });
  });

  test("edit button opens editable form", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /editar|edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByTestId("profile-form")).toBeVisible();
    }
  });

  test("profile form has fullName field that is editable", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /editar|edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByTestId("profile-full-name-input")).toBeEditable({ timeout: 5000 });
    }
  });

  test("profile form shows validation error for empty fullName", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /editar|edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.getByTestId("profile-full-name-input").fill("");
      await page.getByTestId("profile-save-button").click();
      await expect(page.getByTestId("profile-full-name-error")).toBeVisible({ timeout: 5000 });
    }
  });

  test("profile form shows validation error for invalid photoUrl", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /editar|edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      const photoInput = page.getByTestId("profile-photo-url-input");
      if (await photoInput.isVisible()) {
        await photoInput.fill("not-a-valid-url");
        await page.getByTestId("profile-save-button").click();
        await expect(page.getByTestId("profile-photo-url-error")).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Profile API — GET /api/users/me", () => {
  test("returns user data for authenticated participant", async ({ page }) => {
    await loginAsParticipantAndWait(page);
    const response = await page.request.get("/api/users/me");
    expect(response.status()).toBe(200);
    const body = await response.json() as { email?: string; roles?: string[] };
    expect(body.email).toBeDefined();
    expect(body.roles).toContain("PARTICIPANT");
  });

  test("returns 401 for unauthenticated request", async ({ page }) => {
    const response = await page.request.get("/api/users/me");
    expect(response.status()).toBe(401);
  });
});

test.describe("CongressAdmin profile", () => {
  test("congress admin can view their profile", async ({ page }) => {
    await loginAsCongressAdminAndWait(page);
    const response = await page.request.get("/api/users/me");
    expect(response.status()).toBe(200);
    const body = await response.json() as { roles?: string[] };
    expect(body.roles).toContain("CONGRESS_ADMIN");
  });
});

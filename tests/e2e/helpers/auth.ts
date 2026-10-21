import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const MOCK_USERS = {
  participant: {
    email: "participante@usac.edu.gt",
    password: "Password123!",
  },
  congressAdmin: {
    email: "admin@usac.edu.gt",
    password: "Password123!",
  },
  systemAdmin: {
    email: "sysadmin@codenbugs.com",
    password: "Password123!",
  },
} as const;

export const MOCK_IDS = {
  congress1: "20000000-0000-0000-0000-000000000001",
  congress2: "20000000-0000-0000-0000-000000000002",
} as const;

export async function loginAs(
  page: Page,
  role: keyof typeof MOCK_USERS,
): Promise<void> {
  const user = MOCK_USERS[role];
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByTestId("login-email").fill(user.email);
  await page.getByTestId("login-password").fill(user.password);
  await page.getByTestId("login-submit").click();
}

export async function loginAsParticipantAndWait(page: Page): Promise<void> {
  await loginAs(page, "participant");
  await expect(page).toHaveURL(/\/participant\/profile/, { timeout: 10000 });
}

export async function loginAsCongressAdminAndWait(page: Page): Promise<void> {
  await loginAs(page, "congressAdmin");
  await expect(page).toHaveURL(/\/congress-admin\/congresses/, {
    timeout: 10000,
  });
}

export async function loginAsSystemAdminAndWait(page: Page): Promise<void> {
  await loginAs(page, "systemAdmin");
  await expect(page).toHaveURL(/\/system-admin\/users/, { timeout: 10000 });
}

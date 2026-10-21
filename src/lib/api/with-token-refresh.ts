import "server-only";

import { cookies } from "next/headers";
import { ApplicationError } from "@/types/error";
import { setAccessTokenCookie } from "@/lib/auth/cookies";
import { activeIam } from "@/lib/api/active-iam";

/**
 * Executes `fn(token)`. If `fn` throws an ApplicationError with status 401,
 * attempts a token refresh using the refresh_token cookie and retries once.
 * If the refresh fails or the retry also throws 401, re-throws so the caller
 * can return an appropriate error response.
 */
export async function withTokenRefresh<T>(
  token: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  try {
    return await fn(token);
  } catch (error) {
    if (!(error instanceof ApplicationError) || error.status !== 401) {
      throw error;
    }

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (refreshToken === undefined || refreshToken === "") {
      throw error;
    }

    let newAccessToken: string;
    try {
      const refreshed = await activeIam.refreshToken(refreshToken);
      newAccessToken = refreshed.accessToken;
    } catch {
      throw error;
    }

    await setAccessTokenCookie(newAccessToken);
    return fn(newAccessToken);
  }
}

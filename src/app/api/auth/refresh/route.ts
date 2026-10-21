import "server-only";

import { NextResponse } from "next/server";
import { activeIam } from "@/lib/api/active-iam";
import { setAccessTokenCookie } from "@/lib/auth/cookies";
import { ApplicationError } from "@/types/error";
import { cookies } from "next/headers";

export async function POST(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const existingRefreshToken = cookieStore.get("refresh_token")?.value;

    if (existingRefreshToken === undefined || existingRefreshToken === "") {
      return NextResponse.json(
        {
          code: "auth.token_invalid",
          status: 401,
          title: "Unauthorized",
          detail: "No refresh token found.",
        },
        { status: 401 },
      );
    }

    // IAM returns only a new access token — the refresh token stays the same.
    const refreshed = await activeIam.refreshToken(existingRefreshToken);
    await setAccessTokenCookie(refreshed.accessToken);

    return NextResponse.json({ message: "Token renovado exitosamente." }, { status: 200 });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        {
          code: error.code,
          status: error.status,
          title: "Error",
          detail: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        code: "system.internal_error",
        status: 500,
        title: "Internal Server Error",
        detail: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeIam } from "@/lib/api/active-iam";
import {
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse } from "@/lib/api/responses";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (
    !session.roles.includes("SYSTEM_ADMIN") &&
    !session.roles.includes("CONGRESS_ADMIN")
  ) {
    return forbiddenResponse();
  }
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await activeIam.listUsers(token, params));
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

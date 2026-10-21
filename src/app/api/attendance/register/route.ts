import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import {
  unauthorizedResponse,
  internalErrorResponse,
  forbiddenResponse,
  applicationErrorResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("CONGRESS_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    const body: unknown = await request.json();
    return NextResponse.json(await activeConference.registerAttendance(body, token), {
      status: 201,
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

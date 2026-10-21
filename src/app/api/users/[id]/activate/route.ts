import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeIam } from "@/lib/api/active-iam";
import {
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse,
  applicationErrorResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("SYSTEM_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  try {
    await activeIam.activateUser(id, token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import { withTokenRefresh } from "@/lib/api/with-token-refresh";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  const { id } = await params;
  if (session.userId !== id) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    const items = await withTokenRefresh(token, (t) =>
      activeConference.getUserAttendance(id, t),
    );
    return NextResponse.json({ items, totalItems: items.length, totalPages: 1 });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

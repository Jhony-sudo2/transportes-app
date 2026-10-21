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

/**
 * Converts a bare `datetime-local` string ("YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS")
 * to a full ISO-8601 UTC string ("YYYY-MM-DDTHH:MM:00Z") that Spring Boot's OffsetDateTime
 * Jackson deserializer can parse. Values that already carry timezone info are returned as-is.
 */
function normalizeDatetime(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)) return value;
  // Append seconds if missing (datetime-local gives "HH:MM", not "HH:MM:SS")
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return `${withSeconds}Z`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const queryParams = new URL(request.url).searchParams;
    return NextResponse.json(await activeConference.listActivities(id, queryParams));
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("CONGRESS_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const body: Record<string, unknown> = {
      ...raw,
      ...(raw.startTime !== undefined ? { startTime: normalizeDatetime(raw.startTime) } : {}),
      ...(raw.endTime !== undefined ? { endTime: normalizeDatetime(raw.endTime) } : {}),
    };
    return NextResponse.json(await activeConference.createActivity(id, body, token), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

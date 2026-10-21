import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import {
  unauthorizedResponse,
  internalErrorResponse,
  applicationErrorResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { randomUUID } from "crypto";
import { CreateEnrollmentSchema } from "@/lib/validators/enrollment";

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
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  try {
    return NextResponse.json(await activeConference.getCongressEnrollments(id, token));
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
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  try {
    const rawBody: unknown = await request.json();
    const parsed = CreateEnrollmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation.failed", status: 400, errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    // GAP-10: BFF generates the idempotency key
    const idempotencyKey = randomUUID();
    return NextResponse.json(
      await activeConference.enrollInCongress(id, parsed.data, token, idempotencyKey),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

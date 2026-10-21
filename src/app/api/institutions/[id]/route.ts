import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import {
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse,
  applicationErrorResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { UpdateInstitutionSchema } from "@/lib/validators/institution";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  try {
    return NextResponse.json(await activeConference.getInstitution(id));
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("SYSTEM_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  const rawBody: unknown = await request.json();
  const parsed = UpdateInstitutionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ code: "validation.failed", status: 400 }, { status: 400 });
  }
  try {
    return NextResponse.json(await activeConference.updateInstitution(id, parsed.data, token));
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

export async function DELETE(
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
    await activeConference.deleteInstitution(id, token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

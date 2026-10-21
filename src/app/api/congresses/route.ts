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
import { CreateCongressSchema } from "@/lib/validators/congress";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await activeConference.listCongresses(params));
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("CONGRESS_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const rawBody: unknown = await request.json();
  const parsed = CreateCongressSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ code: "validation.failed", status: 400 }, { status: 400 });
  }
  try {
    return NextResponse.json(await activeConference.createCongress(parsed.data, token), { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

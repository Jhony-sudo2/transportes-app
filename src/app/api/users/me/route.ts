import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeIam } from "@/lib/api/active-iam";
import { UpdateUserSchema } from "@/lib/validators/user";
import { unauthorizedResponse, internalErrorResponse } from "@/lib/api/responses";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    return NextResponse.json(await activeIam.getMe(token));
  } catch {
    return internalErrorResponse();
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    const body: unknown = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation.failed", status: 400, title: "Validation Failed", detail: parsed.error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(await activeIam.updateUser(session.userId, parsed.data, token));
  } catch {
    return internalErrorResponse();
  }
}

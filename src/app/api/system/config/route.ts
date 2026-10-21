import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeWallet } from "@/lib/api/active-wallet";
import {
  unauthorizedResponse,
  internalErrorResponse,
  forbiddenResponse,
} from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { z } from "zod";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

const UpdateConfigSchema = z.object({
  commissionPercent: z.number().min(0).max(100),
});

function handleError(error: unknown): NextResponse {
  if (error instanceof ApplicationError) {
    return NextResponse.json(
      { code: error.code, status: error.status, title: "Error", detail: error.message },
      { status: error.status },
    );
  }
  return internalErrorResponse();
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("SYSTEM_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    return NextResponse.json(await activeWallet.getSystemConfig(token));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("SYSTEM_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  try {
    const body: unknown = await request.json();
    const parsed = UpdateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "validation.failed",
          status: 400,
          title: "Validation Failed",
          detail: parsed.error.message,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await activeWallet.updateSystemConfig(parsed.data.commissionPercent, token),
    );
  } catch (error) {
    return handleError(error);
  }
}

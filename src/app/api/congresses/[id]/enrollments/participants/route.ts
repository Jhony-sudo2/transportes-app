import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("CONGRESS_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  const search =
    new URL(request.url).searchParams.get("search")?.trim().toLowerCase() ?? "";

  try {
    const enrollments = await activeConference.getCongressEnrollments(id, token);
    const userIds = [...new Set(enrollments.items.map((e) => e.userId))];

    const settled = await Promise.allSettled(
      userIds.map((uid) => activeIam.getUserById(uid, token)),
    );
    const users = settled
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof activeIam.getUserById>>> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    const filtered =
      search.length < 2
        ? users
        : users.filter(
            (u) =>
              u.fullName.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search) ||
              u.personalId.toLowerCase().includes(search),
          );

    return NextResponse.json({
      items: filtered,
      totalItems: filtered.length,
      totalPages: 1,
      currentPage: 0,
    });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

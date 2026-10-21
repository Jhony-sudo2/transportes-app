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
    const enrollments = await activeConference.getUserEnrollments(id, token);

    // Enrich with congress names in parallel (GET /congresses/{id} is a PUBLIC endpoint)
    const uniqueCongressIds = [...new Set(enrollments.items.map((e) => e.congressId))];
    const congressMap = new Map<string, string>();

    await Promise.allSettled(
      uniqueCongressIds.map(async (cid) => {
        try {
          const congress = await activeConference.getCongress(cid);
          congressMap.set(cid, congress.name);
        } catch {
          // Skip enrichment for this congress if fetch fails
        }
      }),
    );

    const enriched = {
      ...enrollments,
      items: enrollments.items.map((e) => {
        const congressName = congressMap.get(e.congressId);
        return congressName !== undefined ? { ...e, congressName } : e;
      }),
    };

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

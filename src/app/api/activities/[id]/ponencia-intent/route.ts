import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api/responses";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("PARTICIPANT")) return forbiddenResponse();
  const { id } = await params;
  // Placeholder: conference-service endpoint for PONENCIA intent is not yet deployed.
  // Returns 201 so the UI can show "registered" state optimistically.
  return NextResponse.json({ activityId: id }, { status: 201 });
}

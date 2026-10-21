import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ detail: "Origen no permitido." }, { status: 403 });
  await clearAuthCookies();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

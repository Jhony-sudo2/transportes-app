import type { NextRequest } from "next/server";
import { tripAction } from "@/lib/api/trip-actions";
export function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; action: string }> },
) {
  return tripAction(request, context, "branch");
}

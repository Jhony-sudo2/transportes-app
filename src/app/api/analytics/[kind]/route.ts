import type { NextRequest } from "next/server";
import { analyticsOperation } from "@/lib/api/analytics-operations";
export async function GET(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  return analyticsOperation(request, (await context.params).kind);
}

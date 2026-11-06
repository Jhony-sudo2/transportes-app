import type { NextRequest } from "next/server";
import { analyticsOperation } from "@/lib/api/analytics-operations";
// El segmento no se llama "kind" porque en Vercel chocaría con el query param ?kind=.
export async function GET(request: NextRequest, context: { params: Promise<{ report: string }> }) {
  return analyticsOperation(request, (await context.params).report);
}

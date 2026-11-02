import type { NextRequest } from "next/server";
import { commerceOperation } from "@/lib/api/commerce-operations";
type Context = { params: Promise<{ segments: string[] }> };
async function handle(request: NextRequest, context: Context) {
  return commerceOperation(request, (await context.params).segments);
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT };

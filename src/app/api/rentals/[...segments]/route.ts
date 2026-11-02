import type { NextRequest } from "next/server";
import { rentalOperation } from "@/lib/api/rental-operations";
type Context = { params: Promise<{ segments: string[] }> };
async function handle(request: NextRequest, context: Context) {
  return rentalOperation(request, (await context.params).segments);
}
export { handle as GET, handle as POST, handle as PUT };

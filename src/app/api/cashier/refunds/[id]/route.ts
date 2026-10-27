import { NextRequest } from "next/server";
import { refundGet, refundPost } from "@/lib/api/refunds";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, context: Context) {
  return refundGet("cashier", (await context.params).id);
}
export async function POST(request: NextRequest, context: Context) {
  return refundPost(request, "cashier", (await context.params).id);
}

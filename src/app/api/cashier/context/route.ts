import { refundGet } from "@/lib/api/refunds";
export async function GET() {
  return refundGet("cashier");
}

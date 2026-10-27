import { NextResponse } from "next/server";
import { requireCustomerAccess, getCustomerWallet } from "@/lib/api/commerce";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET() {
  try {
    return NextResponse.json(await getCustomerWallet(await requireCustomerAccess()));
  } catch (error) {
    return adminErrorResponse(error);
  }
}

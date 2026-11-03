import { NextRequest, NextResponse } from "next/server";
import { activeBranchDetails, branchJourneyAccess } from "@/lib/api/journey";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET(request: NextRequest) {
  try {
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    return NextResponse.json(await activeBranchDetails(access.token));
  } catch (error) {
    return adminErrorResponse(error);
  }
}

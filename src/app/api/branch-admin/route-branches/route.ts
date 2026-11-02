import { NextRequest, NextResponse } from "next/server";
import { branchJourneyAccess } from "@/lib/api/journey";
import { serviceResult, transportService } from "@/lib/api/transport-service";
import { BranchListSchema } from "@/lib/validators/branch";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET(request: NextRequest) {
  try {
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    return NextResponse.json(
      serviceResult(BranchListSchema, await transportService("branches", access)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

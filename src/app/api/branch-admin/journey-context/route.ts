import { NextRequest, NextResponse } from "next/server";
import { activeBranchDetails, branchJourneyAccess, branchRoutes } from "@/lib/api/journey";
import { transportService, serviceResult } from "@/lib/api/transport-service";
import { adminErrorResponse } from "@/lib/api/admin";
import { BranchListSchema } from "@/lib/validators/branch";
import { BusListSchema, DriverListSchema } from "@/lib/validators/fleet-resources";
import { BusTypeListResponseSchema } from "@/lib/validators/bus-type";
export async function GET(request: NextRequest) {
  try {
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const [branches, routes, buses, drivers, busTypes] = await Promise.all([
      activeBranchDetails(access.token),
      branchRoutes(access),
      transportService(`branches/${access.branchId}/buses`, access),
      transportService(`branches/${access.branchId}/drivers`, access),
      transportService("bus-types", access),
    ]);
    return NextResponse.json({
      branchId: access.branchId,
      branches: serviceResult(BranchListSchema, branches),
      routes,
      buses: serviceResult(BusListSchema, buses),
      drivers: serviceResult(DriverListSchema, drivers),
      busTypes: serviceResult(BusTypeListResponseSchema, busTypes),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

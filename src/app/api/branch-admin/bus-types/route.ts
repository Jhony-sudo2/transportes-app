import { NextResponse } from "next/server";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { BusTypeListResponseSchema as BusTypeListSchema } from "@/lib/validators/bus-type";
export async function GET() {
  try {
    const { token } = await getBranchWorkspace();
    return NextResponse.json(
      validatedFleetResult(BusTypeListSchema, await fleetRequest("bus-types", token)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

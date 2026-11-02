import { NextResponse } from "next/server";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { BusStateListSchema } from "@/lib/validators/fleet-resources";
export async function GET() {
  try {
    const { token } = await getBranchWorkspace();
    return NextResponse.json(
      validatedFleetResult(BusStateListSchema, await fleetRequest("buses/states", token)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

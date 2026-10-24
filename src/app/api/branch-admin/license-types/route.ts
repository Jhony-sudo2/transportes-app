import "server-only";
import { NextResponse } from "next/server";
import { requireBranchAdminAccess } from "@/lib/auth/branch-admin";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { LicenseTypeListSchema } from "@/lib/validators/fleet-resources";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
export async function GET() {
  try {
    const { token } = await requireBranchAdminAccess();
    return NextResponse.json(
      validatedFleetResult(LicenseTypeListSchema, await fleetRequest("licenses/types", token)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

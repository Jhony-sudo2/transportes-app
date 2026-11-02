import { NextResponse } from "next/server";
import { serviceResult, transportService } from "@/lib/api/transport-service";
import { PublicBranchCatalogSchema } from "@/lib/validators/branch-context";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET() {
  try {
    return NextResponse.json(
      serviceResult(PublicBranchCatalogSchema, await transportService("branches/catalog")),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

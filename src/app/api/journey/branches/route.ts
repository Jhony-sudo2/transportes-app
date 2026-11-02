import { NextResponse } from "next/server";
import { serviceResult, transportService } from "@/lib/api/transport-service";
import { ManagedBranchChoiceSchema } from "@/lib/validators/branch-context";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET() {
  try {
    return NextResponse.json(
      serviceResult(ManagedBranchChoiceSchema.array(), await transportService("branches")),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

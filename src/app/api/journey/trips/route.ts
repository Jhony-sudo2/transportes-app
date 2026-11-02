import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkedBody, serviceResult, transportService } from "@/lib/api/transport-service";
import { CivilDateSchema, TripOffersSchema } from "@/lib/validators/journey";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { adminErrorResponse } from "@/lib/api/admin";
const querySchema = z
  .object({
    originBranchId: z.coerce.number().pipe(ManagedBranchIdSchema).optional(),
    destinationBranchId: z.coerce.number().pipe(ManagedBranchIdSchema).optional(),
    date: CivilDateSchema.optional(),
  })
  .strict();
export async function GET(request: NextRequest) {
  try {
    const input = checkedBody(querySchema, Object.fromEntries(request.nextUrl.searchParams));
    const query = new URLSearchParams(
      Object.entries(input).map(([key, value]) => [key, String(value)]),
    );
    return NextResponse.json(
      serviceResult(TripOffersSchema, await transportService(`trips?${query}`)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

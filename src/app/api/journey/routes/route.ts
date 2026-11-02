import { NextResponse } from "next/server";
import { serviceResult, transportService } from "@/lib/api/transport-service";
import { RouteListSchema } from "@/lib/validators/journey";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET() {
  try {
    return NextResponse.json(serviceResult(RouteListSchema, await transportService("routes")));
  } catch (error) {
    return adminErrorResponse(error);
  }
}

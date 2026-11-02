import { NextResponse } from "next/server";
import { driverJourneyAccess, driverTrips } from "@/lib/api/journey";
import { adminErrorResponse } from "@/lib/api/admin";
export async function GET() {
  try {
    return NextResponse.json(await driverTrips(await driverJourneyAccess()));
  } catch (error) {
    return adminErrorResponse(error);
  }
}

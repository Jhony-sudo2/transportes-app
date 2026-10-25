import { NextRequest } from "next/server";
import { updateFleetAvailability } from "@/lib/api/fleet-availability";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateFleetAvailability("buses", request, context);
}

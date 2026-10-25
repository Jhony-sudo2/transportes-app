import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/api/admin";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { fleetRequest } from "@/lib/api/fleet";
import {
  busAvailability,
  driverAvailability,
  type FleetAvailability,
} from "@/lib/fleet-availability";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import {
  BusListSchema,
  BusListRecordSchema,
  DriverListSchema,
  DriverListRecordSchema,
  FleetAvailabilityRequestSchema,
} from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

type Context = { params: Promise<{ id: string }> };
const unconfirmed =
  "No se pudo confirmar el cambio. Actualiza el listado para verificar el estado antes de volver a intentarlo.";

function ensureAllowed(availability: FleetAvailability) {
  if (availability.active === null)
    throw new ApplicationError("resource.conflict", 409, availability.reason);
}

export async function updateFleetAvailability(
  resource: "buses" | "drivers",
  request: NextRequest,
  context: Context,
) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success)
      return NextResponse.json(
        { detail: "El identificador del registro no es válido." },
        { status: 400 },
      );
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = FleetAvailabilityRequestSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: "Envía la sucursal y un estado activo válido." },
        { status: 400 },
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const active = parsed.data.active;
    if (resource === "buses") {
      const buses = validatedFleetResult(
        BusListSchema,
        await fleetRequest(`branches/${branchId}/buses`, token),
      );
      const bus = buses.find((record) => record.id === id.data);
      if (!bus)
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "El bus no pertenece a la sucursal seleccionada.",
        );
      const availability = busAvailability(bus);
      ensureAllowed(availability);
      if (availability.active === active) return NextResponse.json({ item: bus, branchId });
      await fleetRequest(`buses/${id.data}/disponibilidad`, token, { active }, "PATCH");
      const item = validatedFleetResult(
        BusListRecordSchema,
        await fleetRequest(`buses/${id.data}`, token),
        unconfirmed,
      );
      if (item.id !== id.data || busAvailability(item).active !== active)
        throw new ApplicationError("system.internal_error", 502, unconfirmed);
      return NextResponse.json({ item, branchId });
    }
    const drivers = validatedFleetResult(
      DriverListSchema,
      await fleetRequest(`branches/${branchId}/drivers`, token),
    );
    const driver = drivers.find((record) => record.id === id.data);
    if (!driver)
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "El chofer no pertenece a la sucursal seleccionada.",
      );
    const availability = driverAvailability(driver);
    ensureAllowed(availability);
    if (availability.active === active) return NextResponse.json({ item: driver, branchId });
    const item = validatedFleetResult(
      DriverListRecordSchema,
      await fleetRequest(
        `drivers/${id.data}/disponibilidad?active=${active}`,
        token,
        undefined,
        "PATCH",
      ),
      unconfirmed,
    );
    if (item.id !== id.data || driverAvailability(item).active !== active)
      throw new ApplicationError("system.internal_error", 502, unconfirmed);
    return NextResponse.json({ item, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

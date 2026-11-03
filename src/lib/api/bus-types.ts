import "server-only";
import { fleetRequest } from "./fleet";
import { validatedFleetResult } from "./branch-workspace";
import { BusTypeListResponseSchema as BusTypeListSchema } from "@/lib/validators/bus-type";
import { ApplicationError } from "@/types/error";
export async function getBusTypeForUnit(
  token: string,
  id: number,
  rows: number,
  columns: number,
  currentTypeId?: number | null,
) {
  const catalog = validatedFleetResult(BusTypeListSchema, await fleetRequest("bus-types", token));
  const type = catalog.find((item) => item.id === id);
  if (!type || (!type.active && id !== currentTypeId))
    throw new ApplicationError(
      "domain.invariant_violated",
      422,
      "El tipo de bus seleccionado no está disponible.",
    );
  if (rows * columns > type.capacity)
    throw new ApplicationError(
      "domain.invariant_violated",
      422,
      "La distribución supera la capacidad del tipo de bus seleccionado.",
    );
  return type;
}

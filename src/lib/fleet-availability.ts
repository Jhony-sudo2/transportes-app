import type { BusListRecord, DriverListRecord } from "@/lib/validators/fleet-resources";

export type FleetAvailability = { active: boolean | null; reason: string };

export function busAvailability(bus: BusListRecord): FleetAvailability {
  if (bus.state === "AVAILABLE") return { active: true, reason: "" };
  if (bus.state === "OUT_OF_SERVICE") return { active: false, reason: "" };
  return {
    active: null,
    reason:
      bus.state === "IN_SERVICE"
        ? "El bus está en servicio. Finaliza el viaje antes de cambiar su disponibilidad."
        : "Actualiza el listado para confirmar el estado del bus.",
  };
}

export function driverAvailability(driver: DriverListRecord): FleetAvailability {
  if (
    (driver.status === "ACTIVE" || driver.status === "INACTIVE") &&
    driver.pendingOperationId == null &&
    driver.userId != null
  )
    return { active: driver.status === "ACTIVE", reason: "" };
  return {
    active: null,
    reason:
      driver.status === "ACCOUNT_REJECTED"
        ? "El registro del chofer fue rechazado."
        : "El registro del chofer debe estar confirmado y sin operaciones pendientes.",
  };
}

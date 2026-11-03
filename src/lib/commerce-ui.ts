const cancellationReasons: Record<string, string> = {
  ALREADY_CANCELLED: "Este boleto ya está cancelado.",
  BRANCH_FORBIDDEN: "Tu sucursal no tiene autorización para cancelar este boleto.",
  TRIP_STARTED: "El viaje ya inició o finalizó y no permite cancelar este boleto.",
  CUTOFF_REACHED: "El plazo para cancelar este boleto ya venció.",
  JOURNEY_UNAVAILABLE:
    "No se pudo verificar el viaje. Actualiza el comprobante para volver a consultar.",
  TRIP_NOT_FOUND: "No se encontró el viaje de este boleto.",
  POLICY_UNAVAILABLE: "La política de cancelación no está disponible. Inténtalo nuevamente.",
  SCOPE_UNAVAILABLE: "No se pudo verificar tu autorización. Inténtalo nuevamente.",
};
export function cancellationReasonMessage(reason: string | null | undefined): string {
  return reason
    ? (cancellationReasons[reason] ?? reason)
    : "El boleto no admite cancelación en su estado actual.";
}

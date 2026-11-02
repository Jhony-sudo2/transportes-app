// Las fechas civiles no pasan por UTC. Instantes de operaciones: ISO-8601 con offset explícito.
export const BUSINESS_TIME_ZONE = "America/Guatemala";
export function guatemalaDateTime(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
export function guatemalaDate(now = new Date()) {
  return guatemalaDateTime(now).slice(0, 10);
}
export function inputToInstant(value: string) {
  return `${value}:00-06:00`;
}
export function displayInstant(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

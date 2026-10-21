/**
 * Formats a numeric amount as Guatemalan Quetzal currency.
 * Example: 150 -> "Q 150.00"
 */
export function formatCurrency(amount: number): string {
  return `Q ${amount.toFixed(2)}`;
}

/**
 * Formats an ISO 8601 date string to a localized date string.
 * Example: "2024-03-15" -> "15/03/2024"
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats an ISO 8601 datetime string to a localized date-time string.
 * Example: "2024-03-15T14:30:00Z" -> "15/03/2024, 14:30"
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

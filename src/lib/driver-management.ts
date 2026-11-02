import type { DriverListRecord } from "@/types/fleet";

export function canDeleteDriverRequest(driver: DriverListRecord): boolean {
  return (
    driver.status === "ACCOUNT_REJECTED" &&
    driver.userId == null &&
    driver.pendingOperationId == null
  );
}

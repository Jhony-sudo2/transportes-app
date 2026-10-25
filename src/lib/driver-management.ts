import type { DriverListRecord } from "@/lib/validators/fleet-resources";

export function canDeleteDriverRequest(driver: DriverListRecord): boolean {
  return (
    driver.status === "ACCOUNT_REJECTED" &&
    driver.userId == null &&
    driver.pendingOperationId == null
  );
}

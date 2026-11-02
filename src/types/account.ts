import type { TransportUser } from "./auth";
import type { DriverListRecord, DriverOperation } from "./fleet";
export interface AccountDriver extends DriverListRecord {
  userId: number;
  photo: string;
  dpi?: string | null | undefined;
  nit?: string | null | undefined;
  updateFailureReason?: string | null | undefined;
}
export interface AccountProfile {
  user: TransportUser;
  driver: AccountDriver | null;
}
export interface AccountProfileRequest {
  name: string;
  lastName: string;
  email: string;
  nit: string;
  phone: string;
  adress: string;
  dpi: string;
  twoFactorEnabled?: boolean | undefined;
}
export interface AccountPasswordRequest {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}
export interface AccountTwoFactorRequest {
  twoFactorEnabled: boolean;
  currentPassword: string;
}
export interface AccountProfileOperation extends Omit<DriverOperation, "action"> {
  action: "UPDATE";
}

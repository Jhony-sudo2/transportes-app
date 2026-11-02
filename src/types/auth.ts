export type Role = "SYSTEM_ADMIN" | "CONGRESS_ADMIN" | "PARTICIPANT" | "GUEST_SPEAKER";

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  roles: Role[];
  exp: number;
  iat: number;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

// Transportes: Role/Session anteriores se conservan solo para los módulos heredados.
export type TransportRoleName = "ADMIN" | "SUCURSAL_ADMIN" | "CUSTOMER" | "DRIVER" | "CAJERO";
export type ApiRoleName = Exclude<TransportRoleName, "CAJERO"> | "CASHIER";
export interface TransportRole {
  id: number;
  name: TransportRoleName;
}
export interface TransportUser {
  id: number;
  email: string;
  emailVerified?: boolean | undefined;
  role: TransportRole;
  isActive: boolean;
  name: string;
  lastName: string;
  phone?: string | null | undefined;
  nit?: string | null | undefined;
  dpi?: string | null | undefined;
  adress?: string | null | undefined;
  twoFactorEnabled: boolean;
  resetPassword: boolean;
  branchIds?: number[] | null | undefined;
  customerId?: number | null | undefined;
}
export interface TransportLoginRequest {
  email: string;
  password: string;
}
export interface TransportPerson {
  name: string;
  lastName: string;
  dpi: string;
  nit: string;
  phone: string;
  adress: string;
}
export interface TransportRegisterRequest {
  person: TransportPerson;
  credentials: { email: string; password: string; confirmPassword: string };
}
export interface TransportForgotPassword {
  email: string;
}
export interface TransportResetPassword {
  token: string;
  password: string;
  confirmPassword: string;
}

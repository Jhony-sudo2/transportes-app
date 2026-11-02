import type { TransportPerson, TransportRole, ApiRoleName } from "./auth";
export interface AdminRole {
  id: number;
  name: ApiRoleName | "CAJERO";
}
export interface CreateAdminUser {
  person: TransportPerson;
  email: string;
  roleId: number;
  branchIds: number[];
}
export interface CreatedAdminUser {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: TransportRole;
}
export interface AdminUser extends CreatedAdminUser {
  isActive: boolean;
  branchIds?: number[] | null | undefined;
}
export interface AdminUsersPage {
  content: AdminUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface StaffPerson extends Omit<TransportPerson, "adress"> {
  address: string;
}
export interface StaffCreateRequest {
  person: StaffPerson;
  email: string;
  role: ApiRoleName;
  branchIds: number[];
}
export interface StaffCreatedResponse {
  userId: number;
  role: ApiRoleName;
  branchIds: number[];
}
export interface StaffUserResponse extends StaffCreatedResponse {
  name: string;
  lastName: string;
  email: string;
  active: boolean;
}

import type { Role } from "./auth";

export interface User {
  id: string;
  email: string;
  fullName: string;
  organization: string;
  phone: string;
  personalId: string;
  photoUrl?: string | null;
  active: boolean;
  roles: Role[];
  linkedInstitutions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserList {
  items: User[];
  totalItems: number;
  totalPages: number;
  currentPage?: number;
}

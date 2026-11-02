export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface CreateBranch {
  name: string;
  phone: string;
  direction: Coordinate & { municipalityId: number; indication?: string | undefined };
}
export interface Branch {
  id: number;
  name: string;
  phone?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  municipalityId?: number | null | undefined;
  departamentId?: number | null | undefined;
  municipalityName?: string | null | undefined;
  departamentName?: string | null | undefined;
  indication?: string | null | undefined;
  active?: boolean | undefined;
}
export interface Location {
  id: number;
  name: string;
}
export interface ManagedBranchChoice {
  id: number;
  name: string;
}
export interface ManagedBranchContext {
  branches: ManagedBranchChoice[];
  selectedBranchId: number | null;
}

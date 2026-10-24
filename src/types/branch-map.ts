import type { Branch, Coordinate } from "@/lib/validators/branch";
export interface BranchMapProps {
  branches: Branch[];
  point: Coordinate | null;
  focus: Coordinate | null;
  onPointChange?: ((point: Coordinate) => void) | undefined;
}

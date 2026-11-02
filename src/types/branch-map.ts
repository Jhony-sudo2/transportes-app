import type { Branch, Coordinate } from "@/types/branch";
import type { RouteSegment } from "./journey";
export interface BranchMapProps {
  branches: Branch[];
  point: Coordinate | null;
  focus: Coordinate | null;
  onPointChange?: ((point: Coordinate) => void) | undefined;
  segments?: RouteSegment[] | undefined;
}

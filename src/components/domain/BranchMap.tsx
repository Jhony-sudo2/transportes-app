"use client";
import dynamic from "next/dynamic";
import type { BranchMapProps } from "@/types/branch-map";
const MapCanvas = dynamic(() => import("./BranchMapCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="grid min-h-[400px] place-items-center bg-[var(--color-surface)] text-sm"
      role="status"
    >
      Preparando mapa…
    </div>
  ),
});
export function BranchMap(props: BranchMapProps) {
  return (
    <div
      aria-label="Mapa de sucursales"
      className="relative isolate overflow-hidden rounded-xl border border-[var(--tg-line)]"
    >
      <MapCanvas {...props} />
    </div>
  );
}

"use client";
import { Route, IdCard } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";
const items = [
  { label: "Mis viajes", icon: Route, href: "/driver/trips" },
  { label: "Mi licencia", icon: IdCard, href: "/driver/license" },
];
export function DriverNavigation({ name }: { name: string }) {
  const { busy } = useBranchWorkspace();
  return (
    <ManagementNavigation
      name={name}
      role="Chofer"
      navigationLabel="Navegación de chofer"
      items={items.map((item) => ({
        ...item,
        href: busy ? null : item.href,
        disabledReason: "Espera a que termine la operación.",
      }))}
      note="Consulta tus viajes asignados y registra su ejecución."
    />
  );
}

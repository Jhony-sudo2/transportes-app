"use client";
import { House, Undo2, Building2 } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";
import { useCustomerData } from "@/hooks/useCustomerData";
import { RefundBranchSchema } from "@/lib/validators/refunds";

export function CashierNavigation({ name }: { name: string }) {
  const { busy } = useBranchWorkspace();
  const branch = useCustomerData("/api/cashier/context", RefundBranchSchema);
  return (
    <ManagementNavigation
      name={name}
      role="Cajero"
      navigationLabel="Navegación de cajero"
      items={[
        { label: "Inicio", icon: House, href: busy ? null : "/" },
        { label: "Devoluciones", icon: Undo2, href: busy ? null : "/cashier/refunds" },
      ]}
      note="Consulta facturas y registra devoluciones presenciales en tu sucursal."
    >
      <p className="mb-4 flex items-center gap-2 text-sm" aria-label="Sucursal asignada">
        <Building2 size={18} aria-hidden="true" />
        {branch.loading
          ? "Consultando sucursal…"
          : branch.data
            ? "Sucursal: " + branch.data.branchName
            : "Sucursal pendiente de verificar"}
      </p>
    </ManagementNavigation>
  );
}

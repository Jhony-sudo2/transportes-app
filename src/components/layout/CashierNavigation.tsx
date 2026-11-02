"use client";
import { House, Undo2, Building2, BusFront, Wallet, LockKeyhole } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CashContextSchema } from "@/lib/validators/commerce";

export function CashierNavigation({ name }: { name: string }) {
  const { busy } = useBranchWorkspace();
  const branch = useCustomerData("/api/commerce/context", CashContextSchema);
  return (
    <ManagementNavigation
      name={name}
      role="Cajero"
      navigationLabel="Navegación de cajero"
      items={[
        { label: "Inicio", icon: House, href: busy ? null : "/" },
        { label: "Venta presencial", icon: BusFront, href: busy ? null : "/cashier/pos" },
        { label: "Cotizaciones cobrables", icon: BusFront, href: busy ? null : "/cashier/rentals" },
        { label: "Mi caja", icon: Wallet, href: busy ? null : "/cashier/cash" },
        {
          label: "Bloqueos de asientos",
          icon: LockKeyhole,
          href: busy ? null : "/cashier/seat-restrictions",
        },
        { label: "Devoluciones", icon: Undo2, href: busy ? null : "/cashier/refunds" },
      ]}
      note="Vende boletos, cobra cotizaciones y consulta la caja de tu sucursal."
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

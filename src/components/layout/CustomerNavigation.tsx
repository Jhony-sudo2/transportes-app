"use client";
import { House, Wallet, ReceiptText, Undo2 } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";
const items = [
  { label: "Inicio", icon: House, href: "/" },
  { label: "Mi billetera", icon: Wallet, href: "/customer/wallet" },
  { label: "Mis compras", icon: ReceiptText, href: "/customer/purchases" },
  { label: "Devoluciones", icon: Undo2, href: "/customer/refunds" },
];
export function CustomerNavigation({ name }: { name: string }) {
  const { busy } = useBranchWorkspace();
  return (
    <ManagementNavigation
      name={name}
      role="Cliente"
      navigationLabel="Navegación de cliente"
      items={items.map((item) => ({
        ...item,
        href: busy ? null : item.href,
        disabledReason: "Espera a que termine la operación.",
      }))}
      note="Consulta tu billetera, tus compras, tus tickets y las devoluciones disponibles."
    />
  );
}

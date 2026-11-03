import { UsersRound, Building2, ShieldCheck, ChartNoAxesCombined, BusFront } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
const options = [
  { label: "Usuarios", icon: UsersRound, href: "/system-admin/users" },
  { label: "Sucursales", icon: Building2, href: "/system-admin/branches" },
  { label: "Tipos de bus", icon: BusFront, href: "/system-admin/bus-types" },
  { label: "Alquileres", icon: BusFront, href: "/system-admin/rentals" },
  {
    label: "Política de cancelación",
    icon: ShieldCheck,
    href: "/system-admin/cancellation-policy",
  },
  { label: "Categorías de taller", icon: BusFront, href: "/system-admin/expense-categories" },
  { label: "Roles", icon: ShieldCheck, href: "/system-admin/roles" },
  { label: "Reportes", icon: ChartNoAxesCombined, href: "/system-admin/reports" },
];
export function AdminNavigation({ name }: { name: string }): React.ReactElement {
  return (
    <ManagementNavigation
      name={name}
      role="Administrador"
      navigationLabel="Navegación de administrador"
      items={options}
      note="Administra la operación global, las políticas y los informes."
    />
  );
}

import { UsersRound, Building2, ShieldCheck, ChartNoAxesCombined } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
const options = [
  { label: "Usuarios", icon: UsersRound, href: "/system-admin/users" },
  { label: "Sucursales", icon: Building2, href: "/system-admin/branches" },
  { label: "Roles", icon: ShieldCheck, href: null },
  { label: "Reportes", icon: ChartNoAxesCombined, href: null },
];
export function AdminNavigation({ name }: { name: string }): React.ReactElement {
  return (
    <ManagementNavigation
      name={name}
      role="Administrador"
      navigationLabel="Navegación de administrador"
      items={options}
      note="Roles y reportes próximamente"
    />
  );
}

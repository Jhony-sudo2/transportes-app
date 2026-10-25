import Link from "next/link";
import { BusFront, ArrowUpRight, House } from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { getTransportSession } from "@/lib/auth/session";
import { AdminNavigation } from "./AdminNavigation";
import { BranchAdminNavigation } from "./BranchAdminNavigation";
export async function NavBar(): Promise<React.ReactElement> {
  let user = null;
  try {
    user = await getTransportSession();
  } catch {
    /* Las vistas publicas siguen disponibles. */
  }
  if (user?.role.name === "ADMIN" && !user.resetPassword)
    return <AdminNavigation name={user.name + " " + user.lastName} />;
  if (user?.role.name === "SUCURSAL_ADMIN" && !user.resetPassword)
    return <BranchAdminNavigation name={user.name + " " + user.lastName} />;
  if (user && !user.resetPassword) {
    const roleLabels = {
      ADMIN: "Administrador",
      SUCURSAL_ADMIN: "Administrador de sucursales",
      CUSTOMER: "Cliente",
      DRIVER: "Chofer",
      CAJERO: "Cajero",
    };
    return (
      <ManagementNavigation
        name={user.name + " " + user.lastName}
        role={roleLabels[user.role.name]}
        navigationLabel={"Navegación de " + roleLabels[user.role.name].toLowerCase()}
        items={[{ label: "Inicio", icon: House, href: "/" }]}
        note="Consulta y actualiza los datos de tu cuenta."
      />
    );
  }
  return (
    <header className="tg-nav">
      <div className="tg-nav-inner">
        <Link href="/" className="tg-brand">
          <span className="tg-brand-mark">
            <BusFront size={23} aria-hidden="true" />
          </span>
          <span>
            TRANSPORTES<small>GUATEMALA</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/login">Ingresar</Link>
          <Link href="/register" className="tg-nav-register">
            Crear cuenta <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <DarkModeToggle />
        </nav>
      </div>
    </header>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTransportSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
export default async function Home(): Promise<React.ReactElement> {
  let user;
  try {
    user = await getTransportSession();
  } catch {
    return (
      <section className="mx-auto max-w-xl space-y-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Servicio temporalmente no disponible</h1>
        <p>
          No se pudo verificar tu sesión. Inténtalo nuevamente en unos minutos.
        </p>
        <Link href="/" className="underline">
          Reintentar
        </Link>
        <form action="/api/auth/logout" method="post">
          <Button variant="outline">Volver al login</Button>
        </form>
      </section>
    );
  }
  if (!user) redirect("/login");
  const roles = {
    ADMIN: "Administrador del sistema",
    SUCURSAL_ADMIN: "Administrador de sucursal",
    CUSTOMER: "Cliente",
    DRIVER: "Chofer",
    CAJERO: "Cajero",
  };
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-white)] p-8">
        <ShieldCheck
          className="mb-4 text-[var(--color-primary-text)]"
          size={36}
          aria-hidden="true"
        />
        <h1 className="mb-3 text-2xl font-semibold">
          Bienvenido, {user.name} {user.lastName}
        </h1>
        <p className="mb-2">Has iniciado sesión correctamente.</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {user.email} · {roles[user.role.name]}
        </p>
        <p className="my-6 text-sm text-[var(--color-text-secondary)]">
          {user.role.name === "SUCURSAL_ADMIN"
            ? "Selecciona una sucursal para gestionar sus rutas, viajes, buses y choferes."
            : user.role.name === "CUSTOMER"
              ? "Consulta tu billetera, tus compras, tus tickets y las devoluciones por viajes cancelados desde la barra superior."
              : user.role.name === "CAJERO"
                ? "Consulta las facturas y registra devoluciones presenciales desde el apartado Devoluciones de tu sucursal."
                : user.role.name === "DRIVER"
                  ? "En Mis viajes puedes consultar tus asignaciones y registrar la salida y llegada con los datos reales del recorrido."
                  : "Administra el personal, las sucursales y los tipos de bus desde la barra superior."}
        </p>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </section>
  );
}

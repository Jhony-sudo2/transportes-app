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
          No se pudo verificar tu sesión. Comprueba que el gateway y user-service estén activos.
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
          Los módulos de Transportes Guatemala se habilitarán en las próximas etapas.
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

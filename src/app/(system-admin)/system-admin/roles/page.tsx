import Link from "next/link";
import { OperationsPage } from "@/components/domain/OperationsPage";
import type { ApiRoleName } from "@/types/auth";
const profiles = [
  {
    id: 1,
    code: "ADMIN",
    label: "Administrador del sistema",
    scope: "Personal, sucursales, políticas, alquileres globales e informes.",
  },
  {
    id: 2,
    code: "CUSTOMER",
    label: "Cliente",
    scope: "Compra web, billetera, boletos, cotizaciones y reembolsos propios.",
  },
  {
    id: 3,
    code: "SUCURSAL_ADMIN",
    label: "Administrador de sucursal",
    scope: "Operación, flota, alquileres, caja y taller de sus sucursales.",
  },
  {
    id: 4,
    code: "DRIVER",
    label: "Conductor",
    scope: "Viajes asignados, salida, llegada y consulta de licencia.",
  },
  {
    id: 5,
    code: "CASHIER",
    label: "Cajero",
    scope: "Venta presencial, cobro de cotizaciones, caja y pagos de reembolsos.",
  },
] satisfies { id: number; code: ApiRoleName; label: string; scope: string }[];
export default function Page() {
  return (
    <OperationsPage title="Perfiles del proyecto" roles={["ADMIN"]}>
      {() => (
        <div className="space-y-5">
          <p>
            Estos cinco perfiles son fijos. Las asignaciones de personal y sucursales se administran
            desde{" "}
            <Link href="/system-admin/users" className="underline">
              Usuarios
            </Link>
            .
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((role) => (
              <article
                key={role.id}
                className="space-y-3 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
              >
                <h2 className="text-xl font-semibold">{role.label}</h2>
                <p className="text-sm text-[var(--tg-muted)]">
                  {role.code} · Identificador {role.id}
                </p>
                <p>{role.scope}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </OperationsPage>
  );
}

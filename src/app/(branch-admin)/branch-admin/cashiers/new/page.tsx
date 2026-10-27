import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { fleetRequest } from "@/lib/api/fleet";
import { ManagedBranchChoiceSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";

export default async function NewCashierPage() {
  try {
    const { token, branchId } = await getBranchWorkspace();
    const branch =
      branchId === null
        ? null
        : validatedFleetResult(
            ManagedBranchChoiceSchema,
            await fleetRequest(`branches/${branchId}`, token),
          );
    if (branch && branch.id !== branchId)
      throw new ApplicationError("system.internal_error", 502, "No se pudo verificar la sucursal.");
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <p className="tg-eyebrow">ADMINISTRACIÓN DE SUCURSAL / CAJEROS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Un nuevo cajero para tu sucursal.
        </h1>
        <p className="mb-8 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          {branch
            ? "Sucursal: " + branch.name
            : "Elige una sucursal asignada en la barra superior para comenzar."}
        </p>
        {branch ? (
          <CreateUserForm key={branch.id} cashierBranch={branch} />
        ) : (
          <p className="tg-notice" role="status">
            Selecciona la sucursal que vas a administrar para crear un cajero.
          </p>
        )}
      </section>
    );
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    return (
      <section className="mx-auto max-w-3xl space-y-4 px-5 py-12">
        <h1 className="text-2xl font-semibold">Crear cajero</h1>
        <p role="alert">No se pudo cargar la sucursal seleccionada. Inténtalo nuevamente.</p>
        <Link href="/branch-admin/cashiers/new" className="underline">
          Reintentar
        </Link>
      </section>
    );
  }
}

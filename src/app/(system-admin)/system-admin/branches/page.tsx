import { notFound, redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
import { BranchesPageClient } from "@/components/domain/BranchesPageClient";
export default async function BranchesPage() {
  try {
    await requireAdminAccess();
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    throw error;
  }
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">ADMINISTRACIÓN / SUCURSALES</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Nuestra red, en el mapa.
      </h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
        Consulta, registra y actualiza las sedes y su ubicación en el mapa.
      </p>
      <BranchesPageClient />
    </section>
  );
}

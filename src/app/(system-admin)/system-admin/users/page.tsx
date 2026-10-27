import { redirect, notFound } from "next/navigation";
import { requireAdminAccess } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
export default async function AdminUsersPage() {
  try {
    await requireAdminAccess();
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    throw error;
  }
  return (
    <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">ADMINISTRACIÓN / USUARIOS</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Un nuevo integrante del equipo.
      </h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm leading-6 text-[var(--tg-muted)]">
        Crea una cuenta y define su rol en Transportes Guatemala.
      </p>
      <CreateUserForm />
    </section>
  );
}

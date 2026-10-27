import Link from "next/link";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
export default function NewAdminUserPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6 px-5 py-10 md:px-8 md:py-12">
      <Link
        href="/system-admin/users"
        className="text-sm text-[var(--tg-green)] underline underline-offset-4"
      >
        Volver al listado de usuarios
      </Link>
      <div>
        <p className="tg-eyebrow">ADMINISTRACIÓN / USUARIOS / CREAR</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Un nuevo integrante del equipo.
        </h1>
        <p className="mt-3 text-sm text-[var(--tg-muted)]">
          Crea una cuenta y define su rol en Transportes Guatemala.
        </p>
      </div>
      <CreateUserForm />
    </section>
  );
}

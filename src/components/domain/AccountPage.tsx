import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccountAccess, getAccountProfile } from "@/lib/api/account";
import { ApplicationError } from "@/types/error";
import { AccountProfileForm } from "./AccountProfileForm";
import { AccountPasswordForm } from "./AccountPasswordForm";

export async function AccountPage({
  view,
  operationId,
}: {
  view: "profile" | "password";
  operationId?: string | undefined;
}) {
  let access: Awaited<ReturnType<typeof requireAccountAccess>>;
  try {
    access = await requireAccountAccess();
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    return accountError(view, error);
  }
  try {
    const profile = view === "profile" ? await getAccountProfile(access) : null;
    return (
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
        <p className="tg-eyebrow">MI CUENTA</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {view === "profile" ? "Mi perfil." : "Cambia tu contraseña."}
        </h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          {view === "profile"
            ? "Mantén tus datos personales al día."
            : "Protege el acceso a tu cuenta con una nueva contraseña."}
        </p>
        <nav aria-label="Opciones de cuenta" className="mb-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/mi-cuenta"
            aria-current={view === "profile" ? "page" : undefined}
            className="rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-4 py-3 text-[var(--tg-ink)]"
          >
            Datos personales
          </Link>
          <Link
            href="/mi-cuenta/contrasena"
            aria-current={view === "password" ? "page" : undefined}
            className="rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-4 py-3 text-[var(--tg-ink)]"
          >
            Contraseña
          </Link>
        </nav>
        {profile ? (
          <AccountProfileForm initialProfile={profile} initialOperationId={operationId} />
        ) : (
          <AccountPasswordForm />
        )}
      </section>
    );
  } catch (error) {
    return accountError(view, error);
  }
}

function accountError(view: "profile" | "password", error: unknown) {
  return (
    <section className="mx-auto max-w-2xl space-y-5 px-5 py-12">
      <h1 className="text-2xl font-semibold">No se pudo cargar tu cuenta</h1>
      <p role="alert">
        {error instanceof ApplicationError
          ? error.message
          : "Inténtalo nuevamente en unos momentos."}
      </p>
      <Link
        href={view === "profile" ? "/mi-cuenta" : "/mi-cuenta/contrasena"}
        className="underline"
      >
        Reintentar
      </Link>
      <Link href="/forgot-password" className="tg-back-link">
        Solicitar enlace de contraseña
      </Link>
    </section>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, CalendarDays, ArrowRight, CreditCard, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentListSchema } from "@/lib/validators/enrollment";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { formatDate } from "@/lib/utils/format";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function EnrollmentsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/users/${session.userId}/enrollments`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  if (!res.ok) {
    return (
      <div data-testid="enrollments-page" className="flex flex-col gap-6">
        <PageHeader title="Mis inscripciones" description="Congresos en los que estas inscrito." />
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las inscripciones. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const raw: unknown = await res.json();
  const parsed = EnrollmentListSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="enrollments-page" className="flex flex-col gap-6">
        <PageHeader title="Mis inscripciones" description="Congresos en los que estas inscrito." />
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las inscripciones. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const enrollments = parsed.data.items;

  return (
    <div data-testid="enrollments-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mis inscripciones"
        description="Congresos en los que estas inscrito."
        action={
          enrollments.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pale-blue)] px-3 py-1 font-secondary text-xs font-medium text-[var(--color-primary-text)]">
              <BookOpen size={13} strokeWidth={1.5} />
              {enrollments.length} inscripcion{enrollments.length !== 1 ? "es" : ""}
            </span>
          ) : undefined
        }
      />

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} strokeWidth={1.5} />}
          title="No tienes inscripciones"
          description="Explora los congresos disponibles e inscribete."
          action={
            <Link
              href="/congresses"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 font-sans text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Ver congresos
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="enrollment-list"
          aria-label="Lista de inscripciones"
        >
          {enrollments.map((enrollment, index) => (
            <li
              key={enrollment.id}
              className="animate-fade-in-up overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-high)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
              data-testid="enrollment-item"
            >
              {/* Accent bar */}
              <div className="h-0.5 w-full bg-[var(--color-primary)]" />

              <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                {/* Left: icon + info */}
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
                    <BookOpen size={20} strokeWidth={1.5} aria-hidden="true" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/congresses/${enrollment.congressId}`}
                      className="flex items-center gap-1.5 font-sans text-base font-medium text-[var(--color-primary-text)] hover:underline"
                      aria-label={`Ver detalle del congreso`}
                    >
                      {enrollment.congressName ?? "Congreso"}
                      <ExternalLink size={13} strokeWidth={1.5} aria-hidden="true" />
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-secondary text-xs text-[var(--color-text-secondary)]">
                        <CalendarDays size={11} strokeWidth={1.5} aria-hidden="true" />
                        Inscripcion: {formatDate(enrollment.enrolledAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: payment date chip */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 font-secondary text-xs text-[var(--color-text-primary)]">
                    <CreditCard size={11} strokeWidth={1.5} aria-hidden="true" />
                    Pago: {formatDate(enrollment.paymentDate)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

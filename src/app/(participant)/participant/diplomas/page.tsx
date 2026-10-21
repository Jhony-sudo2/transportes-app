import { redirect } from "next/navigation";
import { Award, Download, CalendarDays, Star, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DiplomaListSchema } from "@/lib/validators/diploma";
import type { DiplomaData } from "@/lib/validators/diploma";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { formatDate } from "@/lib/utils/format";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

function DiplomaCard({ diploma, index }: { diploma: DiplomaData; index: number }): React.ReactElement {
  const isLeadership = diploma.type === "LEADERSHIP";

  return (
    <li
      className="animate-fade-in-up overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-high)]"
      style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
      data-testid="diploma-item"
    >
      {/* Colored top bar */}
      <div
        className={`h-1 w-full ${isLeadership ? "bg-[var(--color-accent-amber)]" : "bg-[var(--color-accent-green)]"}`}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isLeadership
                ? "bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber-text)]"
                : "bg-[var(--color-accent-green-bg)] text-[var(--color-accent-green-text)]"
            }`}
          >
            {isLeadership ? (
              <Star size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Award size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${
                  isLeadership
                    ? "bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber-text)]"
                    : "bg-[var(--color-accent-green-bg)] text-[var(--color-accent-green-text)]"
                }`}
              >
                {isLeadership ? "Ponente / Lider" : "Participacion"}
              </span>
            </div>

            <h3 className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
              {diploma.congressName}
            </h3>

            {isLeadership && diploma.activityName !== null && (
              <p className="font-secondary text-sm text-[var(--color-text-primary)]">
                {diploma.activityName}
              </p>
            )}

            <div className="flex items-center gap-1.5 font-secondary text-xs text-[var(--color-text-secondary)]">
              <CalendarDays size={11} strokeWidth={1.5} aria-hidden="true" />
              <span>Emitido el {formatDate(diploma.issuedAt)}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {diploma.available ? (
            <a
              href={`/api/diplomas/${diploma.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 font-sans text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              data-testid="diploma-download-button"
              aria-label={`Ver diploma de ${diploma.congressName}`}
            >
              <Download size={15} strokeWidth={1.5} aria-hidden="true" />
              Ver / Imprimir
            </a>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 font-secondary text-sm text-[var(--color-text-secondary)]">
                <Lock size={13} strokeWidth={1.5} aria-hidden="true" />
                No disponible
              </span>
              <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                Disponible cuando tu participacion sea validada.
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function DiplomasPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/users/${session.userId}/diplomas`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  const diplomasHeader = (
    <PageHeader
      title="Mis diplomas"
      description="Certificados obtenidos por tu participacion en congresos."
    />
  );

  if (!res.ok) {
    return (
      <div data-testid="diplomas-page" className="flex flex-col gap-6">
        {diplomasHeader}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar los diplomas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const raw: unknown = await res.json();
  const parsed = DiplomaListSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="diplomas-page" className="flex flex-col gap-6">
        {diplomasHeader}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar los diplomas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const diplomas = parsed.data.items;
  const available = diplomas.filter((d) => d.available).length;

  return (
    <div data-testid="diplomas-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mis diplomas"
        description="Certificados obtenidos por tu participacion en congresos."
        action={
          diplomas.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-green-bg)] px-3 py-1 font-secondary text-xs font-medium text-[var(--color-accent-green-text)]">
              <Award size={13} strokeWidth={1.5} />
              {available} disponible{available !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      {diplomas.length === 0 ? (
        <EmptyState
          icon={<Award size={28} strokeWidth={1.5} />}
          title="Aun no tienes diplomas"
          description="Participa en congresos y actividades para obtener tus diplomas."
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="diploma-list"
          aria-label="Lista de diplomas"
        >
          {diplomas.map((diploma, index) => (
            <DiplomaCard key={diploma.id} diploma={diploma} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}

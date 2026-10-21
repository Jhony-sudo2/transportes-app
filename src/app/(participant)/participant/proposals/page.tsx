import { redirect } from "next/navigation";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityBadge } from "@/components/domain/ActivityBadge";
import { Badge } from "@/components/ui/badge";
import { ProposalListSchema, type ProposalData } from "@/lib/validators/proposal";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { formatDate } from "@/lib/utils/format";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

const STATUS_LABEL: Record<ProposalData["status"], string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_CLASS: Record<ProposalData["status"], string> = {
  PENDING:
    "bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber-text)] hover:bg-[var(--color-accent-amber-bg)]",
  APPROVED:
    "bg-[var(--color-accent-green-bg)] text-[var(--color-accent-green-text)] hover:bg-[var(--color-accent-green-bg)]",
  REJECTED: "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]",
};

const STATUS_BAR: Record<ProposalData["status"], string> = {
  PENDING: "bg-[var(--color-accent-amber)]",
  APPROVED: "bg-[var(--color-accent-green)]",
  REJECTED: "bg-[var(--color-error)]",
};

export default async function ParticipantProposalsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const res = await serverFetch(`${BASE}/api/users/${session.userId}/proposals`, {
    cache: "no-store",
  });

  if (res.status === 401) redirect("/login");

  if (!res.ok) {
    return (
      <div data-testid="proposals-page" className="flex flex-col gap-6">
        <PageHeader
          title="Mis propuestas"
          description="Propuestas de ponencias y talleres que has enviado."
        />
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las propuestas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const raw: unknown = await res.json();
  const parsed = ProposalListSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="proposals-page" className="flex flex-col gap-6">
        <PageHeader
          title="Mis propuestas"
          description="Propuestas de ponencias y talleres que has enviado."
        />
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las propuestas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const proposals = parsed.data.items;
  const approved = proposals.filter((p) => p.status === "APPROVED").length;
  const pending = proposals.filter((p) => p.status === "PENDING").length;

  return (
    <div data-testid="proposals-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mis propuestas"
        description="Propuestas de ponencias y talleres que has enviado."
        action={
          proposals.length > 0 ? (
            <div className="flex items-center gap-2">
              {approved > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-green-bg)] px-2.5 py-1 font-secondary text-xs font-medium text-[var(--color-accent-green-text)]">
                  <CheckCircle size={12} strokeWidth={1.5} />
                  {approved} aprobada{approved !== 1 ? "s" : ""}
                </span>
              )}
              {pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-amber-bg)] px-2.5 py-1 font-secondary text-xs font-medium text-[var(--color-accent-amber-text)]">
                  <Clock size={12} strokeWidth={1.5} />
                  {pending} pendiente{pending !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {proposals.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} strokeWidth={1.5} />}
          title="No has enviado propuestas"
          description="Cuando envies una propuesta a una convocatoria, aparecera aqui."
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="proposal-list"
          aria-label="Lista de propuestas"
        >
          {proposals.map((proposal, index) => (
            <li
              key={proposal.id}
              className="animate-fade-in-up overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-high)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
              data-testid="proposal-item"
            >
              <div className="flex">
                {/* Left status bar */}
                <div className={`w-1 shrink-0 ${STATUS_BAR[proposal.status]}`} />

                <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-5">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
                      {proposal.title}
                    </h3>
                    <p className="line-clamp-2 font-secondary text-sm leading-relaxed text-[var(--color-text-primary)]">
                      {proposal.description}
                    </p>
                    <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                      Enviada el {formatDate(proposal.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ActivityBadge type={proposal.type} />
                    <Badge
                      className={STATUS_CLASS[proposal.status]}
                      data-testid="proposal-status-badge"
                    >
                      {proposal.status === "APPROVED" && <CheckCircle size={11} strokeWidth={1.5} className="mr-1" />}
                      {proposal.status === "PENDING" && <Clock size={11} strokeWidth={1.5} className="mr-1" />}
                      {proposal.status === "REJECTED" && <XCircle size={11} strokeWidth={1.5} className="mr-1" />}
                      {STATUS_LABEL[proposal.status]}
                    </Badge>
                  </div>
                </div>
              </div>

              {proposal.reviewedAt !== null && (
                <p className="border-t border-[var(--color-border)] px-5 py-3 font-secondary text-xs text-[var(--color-text-secondary)]">
                  Revisada el {formatDate(proposal.reviewedAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

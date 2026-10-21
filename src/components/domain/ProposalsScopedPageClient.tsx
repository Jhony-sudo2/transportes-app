"use client";

import { useState, useCallback } from "react";
import { FileText, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityBadge } from "@/components/domain/ActivityBadge";
import { ProposalListSchema, type ProposalData } from "@/lib/validators/proposal";
import { type CallData } from "@/lib/validators/call";
import { formatDateTime } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface ProposalsScopedPageClientProps {
  congressId: string;
  congressName: string;
  initialProposals: ProposalData[];
  openCall: CallData | null;
  isCommitteeMember: boolean;
}

const STATUS_LABELS: Record<ProposalData["status"], string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_CLASSES: Record<ProposalData["status"], string> = {
  PENDING:
    "bg-[var(--color-warning-bg)] border border-[var(--color-warning)] text-[var(--color-warning-text)]",
  APPROVED: "bg-[var(--color-success)] text-white",
  REJECTED: "bg-[var(--color-error)] text-white",
};

export function ProposalsScopedPageClient({
  congressId,
  congressName,
  initialProposals,
  openCall,
  isCommitteeMember,
}: ProposalsScopedPageClientProps): React.ReactElement {
  const toast = useToast();
  const [proposals, setProposals] = useState<ProposalData[]>(initialProposals);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const refetchProposals = useCallback(async (): Promise<void> => {
    if (openCall === null) return;
    try {
      const res = await fetch(`/api/calls/${openCall.id}/proposals`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = ProposalListSchema.safeParse(raw);
      if (parsed.success) {
        setProposals(parsed.data.items);
      }
    } catch {
      /* silent */
    }
  }, [openCall]);

  const handleEvaluate = async (
    proposalId: string,
    action: "approve" | "reject",
  ): Promise<void> => {
    setMutatingId(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/${action}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        toast.error(
          action === "approve"
            ? "Error al aprobar la propuesta."
            : "Error al rechazar la propuesta.",
        );
        return;
      }
      toast.success(
        action === "approve" ? "Propuesta aprobada." : "Propuesta rechazada.",
      );
      await refetchProposals();
    } catch {
      toast.error("Error de conexion al evaluar la propuesta.");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div data-testid="congress-proposals-scoped-page" className="flex flex-col gap-6">
      <div>
        <Link
          href="/congress-admin/congresses"
          className="inline-flex items-center gap-1.5 font-secondary text-sm text-[var(--color-primary-text)] transition-opacity duration-200 hover:opacity-70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a mis congresos
        </Link>
      </div>

      <PageHeader
        title="Propuestas"
        description={`Revisa y evalua las propuestas del congreso: ${congressName}`}
      />

      {openCall === null ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-12 text-center">
          <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
            No hay una convocatoria abierta para este congreso.{" "}
            <Link
              href={`/congress-admin/congresses/${congressId}/calls`}
              className="text-[var(--color-primary-text)] underline underline-offset-2"
            >
              Gestionar convocatorias
            </Link>
          </p>
        </div>
      ) : (
        <>
          {isCommitteeMember && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-pale-blue)] px-4 py-3">
              <p className="font-sans text-sm font-medium text-[var(--color-primary-text)]">
                Eres miembro del comite de evaluacion para este congreso.
              </p>
            </div>
          )}

          {proposals.length === 0 ? (
            <EmptyState
              icon={<FileText size={24} strokeWidth={1.5} />}
              title="Sin propuestas"
              description="No hay propuestas enviadas para la convocatoria abierta."
            />
          ) : (
            <div
              className="flex flex-col gap-3 animate-fade-in-up"
              data-testid="proposals-list"
            >
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] px-4 py-4"
                  data-testid="proposal-item"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
                        {proposal.title}
                      </p>
                      <ActivityBadge type={proposal.type} />
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${STATUS_CLASSES[proposal.status]}`}
                      >
                        {STATUS_LABELS[proposal.status]}
                      </span>
                    </div>
                    <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
                      {proposal.description}
                    </p>
                    <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                      Enviada: {formatDateTime(proposal.createdAt)}
                    </p>
                    {proposal.reviewedAt !== null && (
                      <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                        Evaluada: {formatDateTime(proposal.reviewedAt)}
                      </p>
                    )}
                  </div>

                  {isCommitteeMember && proposal.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => void handleEvaluate(proposal.id, "approve")}
                        disabled={mutatingId !== null}
                        className="min-h-[44px] bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/90 hover:scale-[1.01] active:scale-[0.99]"
                        data-testid="approve-button"
                      >
                        <CheckCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => void handleEvaluate(proposal.id, "reject")}
                        disabled={mutatingId !== null}
                        className="min-h-[44px] bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90 hover:scale-[1.01] active:scale-[0.99]"
                        data-testid="reject-button"
                      >
                        <XCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

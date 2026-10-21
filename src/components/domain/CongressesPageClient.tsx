"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, CalendarDays, DoorOpen, Activity, Megaphone, FileText, Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CongressFormDialog } from "@/components/domain/CongressFormDialog";
import { DeleteCongressDialog } from "@/components/domain/DeleteCongressDialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { CongressData } from "@/lib/validators/congress";
import type { InstitutionData } from "@/lib/validators/institution";

interface CongressesPageClientProps {
  congresses: CongressData[];
  institutions: InstitutionData[];
}

export function CongressesPageClient({
  congresses,
  institutions,
}: CongressesPageClientProps): React.ReactElement {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CongressData | undefined>(
    undefined,
  );
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  function openCreate(): void {
    setEditTarget(undefined);
    setFormMode("create");
    setFormOpen(true);
  }

  function openEdit(congress: CongressData): void {
    setEditTarget(congress);
    setFormMode("edit");
    setFormOpen(true);
  }

  return (
    <div
      data-testid="congress-admin-congresses-page"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Mis congresos"
        description="Administra los congresos de tus instituciones."
        action={
          <Button
            onClick={openCreate}
            className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            data-testid="new-congress-button"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nuevo congreso
          </Button>
        }
      />

      {congresses.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} strokeWidth={1.5} />}
          title="No tienes congresos aun"
          description="Crea tu primer congreso para comenzar."
          action={
            <Button
              onClick={openCreate}
              className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nuevo congreso
            </Button>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="congresses-list"
          aria-label="Lista de congresos"
        >
          {congresses.map((congress, index) => (
            <li
              key={congress.id}
              className="animate-fade-in-up rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Info block */}
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <h2 className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
                    {congress.name}
                  </h2>
                  <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                    {congress.institutionName}
                  </p>
                  <p className="line-clamp-2 font-secondary text-sm text-[var(--color-text-primary)]">
                    {congress.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <span className="flex items-center gap-1 font-secondary text-xs text-[var(--color-text-secondary)]">
                      <CalendarDays size={12} strokeWidth={1.5} aria-hidden="true" />
                      {formatDate(congress.startDate)} &ndash;{" "}
                      {formatDate(congress.endDate)}
                    </span>
                    <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 font-sans text-xs font-medium text-white">
                      {formatCurrency(congress.price)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(congress)}
                      className="min-h-[44px] border-[var(--color-border)] text-[var(--color-text-primary)]"
                      aria-label={`Editar ${congress.name}`}
                    >
                      <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span className="ml-1.5">Editar</span>
                    </Button>
                    <DeleteCongressDialog
                      congressId={congress.id}
                      congressName={congress.name}
                      onSuccess={() => undefined}
                    />
                  </div>

                  {/* Congress-scoped section links */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/congress-admin/congresses/${congress.id}/rooms`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-secondary text-xs text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-pale-blue)] hover:text-[var(--color-primary-text)]"
                      aria-label={`Salas de ${congress.name}`}
                    >
                      <DoorOpen size={12} strokeWidth={1.5} aria-hidden="true" />
                      Salas
                    </Link>
                    <Link
                      href={`/congress-admin/congresses/${congress.id}/activities`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-secondary text-xs text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-pale-blue)] hover:text-[var(--color-primary-text)]"
                      aria-label={`Actividades de ${congress.name}`}
                    >
                      <Activity size={12} strokeWidth={1.5} aria-hidden="true" />
                      Actividades
                    </Link>
                    <Link
                      href={`/congress-admin/congresses/${congress.id}/calls`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-secondary text-xs text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-pale-blue)] hover:text-[var(--color-primary-text)]"
                      aria-label={`Convocatorias de ${congress.name}`}
                    >
                      <Megaphone size={12} strokeWidth={1.5} aria-hidden="true" />
                      Convocatorias
                    </Link>
                    <Link
                      href={`/congress-admin/congresses/${congress.id}/proposals`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-secondary text-xs text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-pale-blue)] hover:text-[var(--color-primary-text)]"
                      aria-label={`Propuestas de ${congress.name}`}
                    >
                      <FileText size={12} strokeWidth={1.5} aria-hidden="true" />
                      Propuestas
                    </Link>
                    <Link
                      href={`/congress-admin/congresses/${congress.id}/committee`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-secondary text-xs text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-pale-blue)] hover:text-[var(--color-primary-text)]"
                      aria-label={`Comite de ${congress.name}`}
                    >
                      <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                      Comite
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CongressFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        congress={editTarget}
        institutions={institutions}
        onSuccess={() => undefined}
      />
    </div>
  );
}

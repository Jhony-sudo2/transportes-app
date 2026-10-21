"use client";

import { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateGuestSpeakerDialog } from "@/components/domain/CreateGuestSpeakerDialog";
import { type UserData } from "@/lib/validators/user";

interface GuestSpeakersPageClientProps {
  initialGuestSpeakers: UserData[];
}

export function GuestSpeakersPageClient({
  initialGuestSpeakers,
}: GuestSpeakersPageClientProps): React.ReactElement {
  const [guestSpeakers, setGuestSpeakers] = useState<UserData[]>(initialGuestSpeakers);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSpeakerCreated = useCallback((created: UserData): void => {
    setGuestSpeakers((prev) => [created, ...prev]);
  }, []);

  return (
    <div
      data-testid="congress-admin-guest-speakers-page"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Ponentes invitados"
        description="Administra los ponentes invitados registrados en tus congresos."
        action={
          <Button
            onClick={() => { setDialogOpen(true); }}
            className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            data-testid="new-guest-speaker-button"
          >
            <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
            Nuevo ponente invitado
          </Button>
        }
      />

      {guestSpeakers.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={24} strokeWidth={1.5} />}
          title="No hay ponentes invitados registrados"
          description="Registra el primer ponente invitado para tus congresos."
          action={
            <Button
              onClick={() => { setDialogOpen(true); }}
              className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            >
              <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
              Nuevo ponente invitado
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table
            className="w-full min-w-[640px] text-sm"
            data-testid="guest-speakers-table"
            aria-label="Lista de ponentes invitados"
          >
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-sans text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-sans text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Organizacion
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-sans text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Correo electronico
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-sans text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Telefono
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-sans text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Identificacion
                </th>
              </tr>
            </thead>
            <tbody>
              {guestSpeakers.map((speaker, index) => (
                <tr
                  key={speaker.id}
                  className={`animate-fade-in-up border-b border-[var(--color-border)] bg-[var(--color-white)] transition-colors duration-200 last:border-0 hover:bg-[var(--color-surface)]`}
                  style={
                    index > 0
                      ? { animationDelay: `${Math.min(index * 50, 300)}ms` }
                      : undefined
                  }
                  data-testid="guest-speaker-row"
                >
                  <td className="px-4 py-3 font-secondary text-sm font-medium text-[var(--color-text-primary-black)]">
                    {speaker.fullName}
                  </td>
                  <td className="px-4 py-3 font-secondary text-sm text-[var(--color-text-primary)]">
                    {speaker.organization}
                  </td>
                  <td className="px-4 py-3 font-secondary text-sm text-[var(--color-text-primary)]">
                    {speaker.email}
                  </td>
                  <td className="px-4 py-3 font-secondary text-sm text-[var(--color-text-primary)]">
                    {speaker.phone}
                  </td>
                  <td className="px-4 py-3 font-secondary text-sm text-[var(--color-text-secondary)]">
                    {speaker.personalId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateGuestSpeakerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSpeakerCreated}
      />
    </div>
  );
}

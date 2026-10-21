import { redirect } from "next/navigation";
import { BookmarkX, CalendarDays, Layers, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CancelReservationButton } from "@/components/domain/CancelReservationButton";
import { ReservationListSchema } from "@/lib/validators/reservation";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { formatDate } from "@/lib/utils/format";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function ReservationsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/users/${session.userId}/reservations`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  const reservationsHeader = (
    <PageHeader
      title="Mis reservas"
      description="Talleres en los que tienes lugar reservado."
    />
  );

  if (!res.ok) {
    if (res.status === 404 || res.status >= 500) {
      return (
        <div data-testid="reservations-page" className="flex flex-col gap-6">
          {reservationsHeader}
          <EmptyState
            icon={<BookmarkX size={28} strokeWidth={1.5} />}
            title="Reservas no disponibles"
            description="Esta funcionalidad estara disponible pronto. Vuelve a intentarlo mas tarde."
          />
        </div>
      );
    }
    return (
      <div data-testid="reservations-page" className="flex flex-col gap-6">
        {reservationsHeader}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las reservas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const raw: unknown = await res.json();
  const parsed = ReservationListSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="reservations-page" className="flex flex-col gap-6">
        {reservationsHeader}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar las reservas. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const reservations = parsed.data.items;

  return (
    <div data-testid="reservations-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mis reservas"
        description="Talleres en los que tienes lugar reservado."
        action={
          reservations.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-amber-bg)] px-3 py-1 font-secondary text-xs font-medium text-[var(--color-accent-amber-text)]">
              <Bookmark size={13} strokeWidth={1.5} />
              {reservations.length} reserva{reservations.length !== 1 ? "s" : ""} activa{reservations.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      {reservations.length === 0 ? (
        <EmptyState
          icon={<BookmarkX size={28} strokeWidth={1.5} />}
          title="No tienes reservas activas"
          description="Reserva un lugar en los talleres disponibles desde el detalle del congreso."
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="reservation-list"
          aria-label="Lista de reservas"
        >
          {reservations.map((reservation, index) => (
            <li
              key={reservation.id}
              className="animate-fade-in-up overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-high)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
              data-testid="reservation-item"
            >
              {/* Amber accent bar — workshop theme */}
              <div className="h-0.5 w-full bg-[var(--color-accent-amber)]" />

              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  {/* Workshop icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber-text)]">
                    <Layers size={20} strokeWidth={1.5} aria-hidden="true" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
                        Taller reservado
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[var(--color-accent-amber-bg)] px-2 py-0.5 font-secondary text-xs font-medium text-[var(--color-accent-amber-text)]">
                        Activa
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-secondary text-xs text-[var(--color-text-secondary)]">
                      <CalendarDays size={11} strokeWidth={1.5} aria-hidden="true" />
                      <span>Reservado el {formatDate(reservation.reservedAt)}</span>
                    </div>
                  </div>
                </div>

                <CancelReservationButton reservationId={reservation.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

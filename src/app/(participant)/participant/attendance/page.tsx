import { redirect } from "next/navigation";
import { CheckSquare, CalendarCheck, ClipboardX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AttendanceListSchema } from "@/lib/validators/attendance";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { formatDateTime } from "@/lib/utils/format";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function ParticipantAttendancePage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/users/${session.userId}/attendance`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  const header = (
    <PageHeader
      title="Mi asistencia"
      description="Actividades en las que tu asistencia fue registrada."
    />
  );

  if (!res.ok) {
    return (
      <div data-testid="attendance-page" className="flex flex-col gap-6">
        {header}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar el historial de asistencia. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const raw: unknown = await res.json();
  const parsed = AttendanceListSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="attendance-page" className="flex flex-col gap-6">
        {header}
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar el historial de asistencia. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const records = parsed.data.items;

  return (
    <div data-testid="attendance-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mi asistencia"
        description="Actividades en las que tu asistencia fue registrada."
        action={
          records.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pale-blue)] px-3 py-1 font-secondary text-xs font-medium text-[var(--color-primary-text)]">
              <CheckSquare size={13} strokeWidth={1.5} />
              {records.length} registro{records.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      {records.length === 0 ? (
        <EmptyState
          icon={<ClipboardX size={28} strokeWidth={1.5} />}
          title="Sin registros de asistencia"
          description="Aun no tienes asistencias registradas. El administrador del congreso las registra en el momento del evento."
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="attendance-list"
          aria-label="Lista de asistencias"
        >
          {records.map((record, index) => (
            <li
              key={record.id}
              className="animate-fade-in-up overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-high)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
              data-testid="attendance-item"
            >
              <div className="h-0.5 w-full bg-[var(--color-primary)]" />

              <div className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
                  <CalendarCheck size={20} strokeWidth={1.5} aria-hidden="true" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
                    Asistencia registrada
                  </span>
                  <span className="font-secondary text-xs text-[var(--color-text-secondary)]">
                    ID: {record.personalId} &mdash; {formatDateTime(record.registeredAt)}
                  </span>
                </div>

                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--color-pale-blue)] px-2 py-0.5 font-secondary text-xs font-medium text-[var(--color-primary-text)]">
                  <CheckSquare size={11} strokeWidth={1.5} />
                  Confirmada
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

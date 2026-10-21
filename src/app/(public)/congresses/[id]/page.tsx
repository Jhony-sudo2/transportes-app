import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Building2, Users, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityBadge } from "@/components/domain/ActivityBadge";
import { CongressActions } from "@/components/domain/CongressActions";
import { ReserveActivityButton } from "@/components/domain/ReserveActivityButton";
import { AttendActivityButton } from "@/components/domain/AttendActivityButton";
import { SubmitProposalButton } from "@/components/domain/SubmitProposalButton";
import { CongressSchema } from "@/lib/validators/congress";
import { ActivityListSchema } from "@/lib/validators/activity";
import { CallListSchema } from "@/lib/validators/call";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import type { CongressData } from "@/lib/validators/congress";
import type { ActivityData } from "@/lib/validators/activity";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

interface CongressDetailPageProps {
  params: Promise<{ id: string }>;
}

async function fetchCongress(id: string): Promise<CongressData | null> {
  const res = await fetch(`${BASE}/api/congresses/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const raw: unknown = await res.json();
  const parsed = CongressSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function fetchActivities(congressId: string): Promise<ActivityData[]> {
  const res = await fetch(`${BASE}/api/congresses/${congressId}/activities`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const raw: unknown = await res.json();
  const parsed = ActivityListSchema.safeParse(raw);
  return parsed.success ? parsed.data.items : [];
}

async function fetchOpenCall(congressId: string): Promise<{ hasOpenCall: boolean; openCallId: string | null }> {
  try {
    const res = await fetch(`${BASE}/api/congresses/${congressId}/calls`, {
      cache: "no-store",
    });
    if (!res.ok) return { hasOpenCall: false, openCallId: null };
    const raw: unknown = await res.json();
    const parsed = CallListSchema.safeParse(raw);
    if (!parsed.success) return { hasOpenCall: false, openCallId: null };
    const open = parsed.data.items.find((c) => c.status === "OPEN");
    return { hasOpenCall: open !== undefined, openCallId: open?.id ?? null };
  } catch {
    return { hasOpenCall: false, openCallId: null };
  }
}

export default async function CongressDetailPage({
  params,
}: CongressDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  const [congress, activities, { hasOpenCall, openCallId }] = await Promise.all([
    fetchCongress(id),
    fetchActivities(id),
    fetchOpenCall(id),
  ]);

  if (congress === null) {
    notFound();
  }

  return (
    <div
      data-testid="congress-detail-page"
      className="mx-auto flex max-w-4xl flex-col gap-8"
    >
      {/* Hero */}
      <section
        data-testid="congress-hero"
        className="animate-fade-in-down rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-6"
      >
        {/* Header row */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title={congress.name}
            description={congress.institutionName}
            className="mb-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            {openCallId !== null && (
              <SubmitProposalButton callId={openCallId} />
            )}
            <CongressActions congressId={congress.id} hasOpenCall={hasOpenCall} />
          </div>
        </div>

        <p className="mb-6 font-secondary text-sm leading-relaxed text-[var(--color-text-primary)]">
          {congress.description}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Dates */}
          <div className="flex items-center gap-2 font-secondary text-sm text-[var(--color-text-secondary)]">
            <CalendarDays
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--color-primary-text)]"
              aria-hidden="true"
            />
            <span>
              {formatDate(congress.startDate)}&nbsp;&ndash;&nbsp;{formatDate(congress.endDate)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 font-secondary text-sm text-[var(--color-text-secondary)]">
            <MapPin
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--color-primary-text)]"
              aria-hidden="true"
            />
            <span>{congress.location}</span>
          </div>

          {/* Institution */}
          <div className="flex items-center gap-2 font-secondary text-sm text-[var(--color-text-secondary)]">
            <Building2
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--color-primary-text)]"
              aria-hidden="true"
            />
            <span>{congress.institutionName}</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 font-secondary text-sm font-medium text-[var(--color-text-primary-black)]">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
              Q
            </span>
            <span>Precio de inscripcion: {formatCurrency(congress.price)}</span>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section>
        <h2 className="mb-4 font-sans text-xl font-medium text-[var(--color-text-primary-black)]">
          Actividades del congreso
        </h2>

        {activities.length === 0 ? (
          <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
            Este congreso aun no tiene actividades registradas.
          </p>
        ) : (
          <ul
            className="flex flex-col gap-4"
            data-testid="activities-list"
            aria-label="Lista de actividades"
          >
            {activities.map((activity, index) => (
              <li
                key={activity.id}
                className="animate-fade-in-up rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-high)]"
                style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
                data-testid="activity-item"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ActivityBadge type={activity.type} />
                    <h3 className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
                      {activity.name}
                    </h3>
                  </div>

                  {activity.type === "TALLER" &&
                    activity.workshopCapacity !== null && (
                      <span className="flex items-center gap-1 font-secondary text-xs text-[var(--color-text-secondary)]">
                        <Users
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        Cupo: {activity.workshopCapacity} participantes
                      </span>
                    )}
                </div>

                <p className="mb-3 font-secondary text-sm leading-relaxed text-[var(--color-text-primary)]">
                  {activity.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 font-secondary text-xs text-[var(--color-text-secondary)]">
                    <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>
                      {formatDateTime(activity.startTime)}&nbsp;&ndash;&nbsp;
                      {formatDateTime(activity.endTime)}
                    </span>
                  </div>

                  {activity.type === "TALLER" && (
                    <ReserveActivityButton activityId={activity.id} />
                  )}
                  {activity.type === "PONENCIA" && (
                    <AttendActivityButton activityId={activity.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

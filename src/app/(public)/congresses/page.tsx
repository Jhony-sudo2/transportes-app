import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { CongressCard } from "@/components/domain/CongressCard";
import { CongressFilters } from "@/components/domain/CongressFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { HexPattern } from "@/components/ui/hex-pattern";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { CongressListSchema } from "@/lib/validators/congress";
import { InstitutionListSchema, type InstitutionData } from "@/lib/validators/institution";
import type { CongressSummary } from "@/types/congress";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

interface CongressesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function fetchCongresses(params: URLSearchParams): Promise<CongressSummary[]> {
  const url = `${BASE}/api/congresses${params.size > 0 ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const raw: unknown = await res.json();
  const parsed = CongressListSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.items;
}

async function fetchInstitutions(): Promise<InstitutionData[]> {
  const res = await fetch(`${BASE}/api/institutions`, { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const raw: unknown = await res.json();
  const parsed = InstitutionListSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.items;
}

export default async function CongressesPage({
  searchParams,
}: CongressesPageProps): Promise<React.ReactElement> {
  const resolvedParams = await searchParams;

  const search = typeof resolvedParams["search"] === "string" ? resolvedParams["search"] : "";
  const institutionId =
    typeof resolvedParams["institutionId"] === "string" ? resolvedParams["institutionId"] : "";

  const upstreamParams = new URLSearchParams();
  if (search !== "") upstreamParams.set("search", search);
  if (institutionId !== "") upstreamParams.set("institutionId", institutionId);

  const [congresses, institutions] = await Promise.all([
    fetchCongresses(upstreamParams),
    fetchInstitutions(),
  ]);

  return (
    <div data-testid="congresses-page">
      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12">
        <HexPattern size={36} opacity={0.04} stroke="var(--color-primary)" />
        <div className="relative mx-auto max-w-[var(--container-max)]">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pale-blue)] px-3 py-1 font-secondary text-xs font-medium text-[var(--color-primary-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            Explora y participa
          </span>
          <h1 className="font-sans text-3xl font-medium text-[var(--color-text-primary-black)]">
            Congresos disponibles
          </h1>
          <p className="mt-2 max-w-xl font-secondary text-sm text-[var(--color-text-secondary)]">
            Descubre los congresos academicos disponibles e inscribete desde aqui.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-8">
        <div className="flex flex-col gap-6">
          <Suspense fallback={<LoadingPage />}>
            <CongressFilters
              institutions={institutions}
              currentSearch={search}
              currentInstitutionId={institutionId}
            />
          </Suspense>

          {congresses.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={28} strokeWidth={1.5} />}
              title="No hay congresos disponibles"
              description="Vuelve mas tarde para ver nuevos congresos."
              className="mt-4"
            />
          ) : (
            <div
              className="grid animate-fade-in-up grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="congress-grid"
            >
              {congresses.map((congress, index) => (
                <div
                  key={congress.id}
                  className="animate-fade-in-up"
                  style={
                    index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined
                  }
                >
                  <CongressCard congress={congress} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { CongressSummary } from "@/types/congress";

interface CongressCardProps {
  congress: CongressSummary;
}

export function CongressCard({ congress }: CongressCardProps): React.ReactElement {
  return (
    <article
      className="group flex flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-high)]"
      data-testid="congress-card"
    >
      {/* Animated accent bar */}
      <div className="relative h-1.5 overflow-hidden rounded-t-[var(--radius-md)] bg-[var(--color-pale-blue)]">
        <div className="absolute inset-y-0 left-0 w-0 bg-[var(--color-primary)] transition-all duration-500 group-hover:w-full" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Institution chip */}
        <div className="flex items-center gap-1.5">
          <Building2 size={11} strokeWidth={1.5} className="shrink-0 text-[var(--color-text-secondary)]" />
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap font-secondary text-xs text-[var(--color-text-secondary)]"
            data-testid="congress-card-institution"
          >
            {congress.institutionName}
          </span>
        </div>

        {/* Title + price badge */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className="font-sans text-base font-medium leading-snug text-[var(--color-text-primary-black)] transition-colors duration-200 group-hover:text-[var(--color-primary-text)]"
            data-testid="congress-card-name"
          >
            {congress.name}
          </h3>
          {/*
           * Badge uses solid primary bg + white text — works in both light and dark
           * because --color-primary is always a dark-enough blue for white text.
           */}
          <Badge
            className="shrink-0 rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 font-sans text-xs font-medium text-white hover:bg-[var(--color-primary)]"
            data-testid="congress-card-price"
          >
            {formatCurrency(congress.price)}
          </Badge>
        </div>

        {/* Description */}
        <p className="line-clamp-2 flex-1 font-secondary text-sm leading-relaxed text-[var(--color-text-primary)]">
          {congress.description}
        </p>

        {/* Metadata footer */}
        <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-3">
          <span
            className="flex items-center gap-1.5 font-secondary text-xs text-[var(--color-text-secondary)]"
            data-testid="congress-card-dates"
          >
            <CalendarDays size={11} strokeWidth={1.5} className="shrink-0" />
            {formatDate(congress.startDate)} &ndash; {formatDate(congress.endDate)}
          </span>
          {congress.location !== undefined && congress.location !== "" && (
            <span className="flex items-center gap-1.5 font-secondary text-xs text-[var(--color-text-secondary)]">
              <MapPin size={11} strokeWidth={1.5} className="shrink-0" />
              {congress.location}
            </span>
          )}
        </div>

        {/* CTA button — appears on hover */}
        <Link
          href={`/congresses/${congress.id}`}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-primary)] px-4 py-2 font-sans text-sm font-medium text-[var(--color-primary-text)] no-underline opacity-0 transition-all duration-200 hover:bg-[var(--color-pale-blue)] group-hover:opacity-100"
          data-testid="congress-card-detail-link"
        >
          Ver detalle
          <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        "animate-fade-in relative flex flex-col items-center justify-center gap-4",
        "overflow-hidden rounded-[var(--radius-md)] border border-dashed",
        "border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-14 text-center",
        className,
      )}
      data-testid="empty-state"
    >
      {/* Decorative hexagon watermark */}
      <span className="pointer-events-none absolute -right-4 -top-4 text-[var(--color-primary)] opacity-[0.04]">
        <Hexagon size={120} strokeWidth={1} />
      </span>
      <span className="pointer-events-none absolute -bottom-6 -left-6 text-[var(--color-primary)] opacity-[0.03]">
        <Hexagon size={160} strokeWidth={1} />
      </span>

      {icon !== undefined && (
        <div className="animate-scale-in relative flex items-center justify-center">
          {/* Outer ring pulse */}
          <span className="absolute h-20 w-20 rounded-full bg-[var(--color-pale-blue)] opacity-40" />
          {/* Inner icon circle */}
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-pale-blue)] text-[var(--color-primary-text)] shadow-[var(--shadow-raised)]">
            {icon}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
          {title}
        </p>
        {description !== undefined && (
          <p className="max-w-xs font-secondary text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>

      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}

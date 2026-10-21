import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
} as const;

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block animate-spin rounded-full border-[var(--color-border)] border-t-[var(--color-primary)]",
        SIZE_MAP[size],
        className,
      )}
    />
  );
}

export function LoadingPage(): React.ReactElement {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5">
      {/* Layered spinner with bug icon */}
      <div className="relative flex items-center justify-center">
        <span
          className="h-14 w-14 animate-spin rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)]"
          role="status"
          aria-label="Cargando"
        />
        <span className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
          <Bug size={16} strokeWidth={2} />
        </span>
      </div>
      <p className="animate-pulse-soft font-secondary text-sm text-[var(--color-text-secondary)]">
        Cargando...
      </p>
    </div>
  );
}

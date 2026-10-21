import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/types/activity";

interface ActivityBadgeProps {
  type: ActivityType;
}

const LABEL_MAP: Record<ActivityType, string> = {
  PONENCIA: "Ponencia",
  TALLER: "Taller",
};

export function ActivityBadge({ type }: ActivityBadgeProps): React.ReactElement {
  const isPonencia = type === "PONENCIA";

  return (
    <Badge
      className={cn(
        /*
         * Use solid primary bg + white text so it reads in both light and dark mode.
         * Tinted backgrounds (pale-blue/soft-blue) don't work in dark mode because
         * the primary color used as text has poor contrast on those dark navy surfaces.
         */
        "rounded-full border-none px-2.5 py-0.5 font-sans text-xs font-medium text-white",
        isPonencia
          ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]"
          : "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]",
      )}
      data-testid={`activity-badge-${type.toLowerCase()}`}
    >
      {LABEL_MAP[type]}
    </Badge>
  );
}

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={cn("skeleton-shimmer rounded-[var(--radius-sm)]", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): React.ReactElement {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5"
      aria-hidden="true"
    >
      <div className="mb-1 h-1 w-0 rounded-t-[var(--radius-md)] bg-[var(--color-surface)]" />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

export function SkeletonTableRow(): React.ReactElement {
  return (
    <div
      className="flex items-center gap-4 border-b border-[var(--color-border)] py-3"
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-1/5" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => i).map((i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonStats(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-4"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader(): React.ReactElement {
  return (
    <div className="mb-6 flex items-start justify-between gap-4" aria-hidden="true">
      <div className="flex gap-3">
        <div className="w-1 self-stretch rounded-full bg-[var(--color-border)]" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-9 w-32 rounded-[var(--radius-md)]" />
    </div>
  );
}

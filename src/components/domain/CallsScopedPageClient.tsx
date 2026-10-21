"use client";

import { useState, useCallback } from "react";
import { Megaphone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CallListSchema, type CallData } from "@/lib/validators/call";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { formatDateTime } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface CallsScopedPageClientProps {
  congressId: string;
  congressName: string;
  initialCalls: CallData[];
}

export function CallsScopedPageClient({
  congressId,
  congressName,
  initialCalls,
}: CallsScopedPageClientProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [calls, setCalls] = useState<CallData[]>(initialCalls);
  const [mutating, setMutating] = useState(false);

  const refreshCalls = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/congresses/${congressId}/calls`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = CallListSchema.safeParse(raw);
      if (parsed.success) {
        setCalls(parsed.data.items);
      }
    } catch {
      /* silent */
    }
  }, [congressId]);

  const handleOpenCall = async (): Promise<void> => {
    setMutating(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/calls`, { method: "POST" });
      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        toast.error(parsed.success ? parsed.data.detail : "Error al abrir la convocatoria.");
        return;
      }
      toast.success("Convocatoria abierta exitosamente.");
      router.refresh();
      await refreshCalls();
    } catch {
      toast.error("Error de conexion al abrir la convocatoria.");
    } finally {
      setMutating(false);
    }
  };

  const handleCloseCall = async (callId: string): Promise<void> => {
    setMutating(true);
    try {
      const res = await fetch(`/api/calls/${callId}/close`, { method: "PATCH" });
      if (!res.ok) {
        toast.error("Error al cerrar la convocatoria.");
        return;
      }
      toast.success("Convocatoria cerrada exitosamente.");
      router.refresh();
      await refreshCalls();
    } catch {
      toast.error("Error de conexion al cerrar la convocatoria.");
    } finally {
      setMutating(false);
    }
  };

  const hasOpenCall = calls.some((c) => c.status === "OPEN");

  return (
    <div data-testid="congress-calls-scoped-page" className="flex flex-col gap-6">
      <div>
        <Link
          href="/congress-admin/congresses"
          className="inline-flex items-center gap-1.5 font-secondary text-sm text-[var(--color-primary-text)] transition-opacity duration-200 hover:opacity-70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a mis congresos
        </Link>
      </div>

      <PageHeader
        title="Convocatorias"
        description={`Gestiona las convocatorias del congreso: ${congressName}`}
        action={
          !hasOpenCall ? (
            <Button
              onClick={() => void handleOpenCall()}
              disabled={mutating}
              className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
              data-testid="open-call-button"
            >
              <Megaphone size={16} strokeWidth={1.5} aria-hidden="true" />
              Abrir convocatoria
            </Button>
          ) : undefined
        }
      />

      {calls.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={24} strokeWidth={1.5} />}
          title="Sin convocatorias"
          description="Este congreso no tiene convocatorias registradas aun."
          action={
            <Button
              onClick={() => void handleOpenCall()}
              disabled={mutating}
              className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
              data-testid="open-call-button"
            >
              <Megaphone size={16} strokeWidth={1.5} aria-hidden="true" />
              Abrir convocatoria
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="calls-list">
          {calls.map((call) => (
            <div
              key={call.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] px-4 py-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-medium text-white ${
                      call.status === "OPEN"
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-text-secondary)]"
                    }`}
                  >
                    {call.status === "OPEN" ? "Abierta" : "Cerrada"}
                  </span>
                </div>
                <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                  Apertura: {formatDateTime(call.openedAt)}
                </p>
                {call.closedAt !== null && (
                  <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                    Cierre: {formatDateTime(call.closedAt)}
                  </p>
                )}
              </div>
              {call.status === "OPEN" && (
                <Button
                  variant="outline"
                  onClick={() => void handleCloseCall(call.id)}
                  disabled={mutating}
                  className="min-h-[44px] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                  data-testid="close-call-button"
                >
                  Cerrar convocatoria
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

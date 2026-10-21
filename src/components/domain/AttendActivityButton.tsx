"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface AttendActivityButtonProps {
  activityId: string;
}

export function AttendActivityButton({
  activityId,
}: AttendActivityButtonProps): React.ReactElement {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleClick(): Promise<void> {
    setIsPending(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/ponencia-intent`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 409) {
        toast.error("Ya estas registrado en esta actividad.");
        return;
      }
      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        const code = parsed.success ? parsed.data.code : "system.internal_error";
        toast.error(
          ERROR_MESSAGES[code] ?? ERROR_MESSAGES["system.internal_error"] ?? "Error al registrar.",
        );
        return;
      }
      toast.success("Te has registrado en esta actividad.");
      router.refresh();
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error al registrar.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void handleClick();
      }}
      disabled={isPending}
      className="min-h-[44px] border-[var(--color-primary)] text-[var(--color-primary-text)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      data-testid="attend-activity-button"
      aria-label="Registrarse para asistir a la ponencia"
    >
      <UserCheck size={15} strokeWidth={1.5} aria-hidden="true" />
      <span className="ml-1.5">{isPending ? "Registrando..." : "Asistir"}</span>
    </Button>
  );
}

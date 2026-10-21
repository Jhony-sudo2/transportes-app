"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface ReserveActivityButtonProps {
  activityId: string;
}

export function ReserveActivityButton({ activityId }: ReserveActivityButtonProps): React.ReactElement {
  const [isReserving, setIsReserving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleClick(): Promise<void> {
    setIsReserving(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/reservations`, {
        method: "POST",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        const code = parsed.success ? parsed.data.code : "system.internal_error";
        const message =
          ERROR_MESSAGES[code] ??
          ERROR_MESSAGES["system.internal_error"] ??
          "Error al reservar el taller.";
        toast.error(message);
        return;
      }

      toast.success("Lugar reservado exitosamente.");
      router.refresh();
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error al reservar el taller.");
    } finally {
      setIsReserving(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { void handleClick(); }}
      disabled={isReserving}
      className="min-h-[44px] border-[var(--color-primary)] text-[var(--color-primary-text)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      data-testid="reserve-activity-button"
      aria-label="Reservar lugar en taller"
    >
      <Bookmark size={15} strokeWidth={1.5} aria-hidden="true" />
      <span className="ml-1.5">{isReserving ? "Reservando..." : "Reservar"}</span>
    </Button>
  );
}

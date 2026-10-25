"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FleetField } from "./FleetField";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import {
  AccountPasswordRequestSchema,
  type AccountPasswordRequest,
} from "@/lib/validators/account";
import { readFleetResponse } from "@/lib/fleet-ui";

export function AccountPasswordForm() {
  const { busy, setBusy } = useBranchWorkspace();
  const active = useRef(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountPasswordRequest>({ resolver: zodResolver(AccountPasswordRequestSchema) });
  async function submit(data: AccountPasswordRequest) {
    if (active.current || busy) return;
    active.current = true;
    setBusy(true);
    setError("");
    try {
      const body = await readFleetResponse(
        await fetch("/api/account/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );
      if (!body || typeof body !== "object" || !("status" in body) || body.status !== "changed")
        throw new Error(
          "No se pudo confirmar el cambio. Intenta iniciar sesión antes de repetirlo.",
        );
      reset();
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar el cambio.");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="max-w-2xl space-y-6 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
      <h2 className="text-xl font-semibold">
        {done ? "Contraseña actualizada" : "Nueva contraseña de acceso"}
      </h2>
      {done ? (
        <div className="space-y-5">
          <p role="status">
            Tu contraseña fue actualizada y tu sesión se cerró. Inicia sesión con la nueva
            contraseña.
          </p>
          <Button asChild>
            <a href="/login">Iniciar sesión</a>
          </Button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
          className="space-y-5"
        >
          <p className="text-sm text-[var(--tg-muted)]">
            Escribe tu contraseña actual y elige una nueva de 6 a 20 caracteres.
          </p>
          <FleetField
            id="account-current-password"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            maxLength={100}
            disabled={busy}
            error={errors.currentPassword}
            {...register("currentPassword")}
          />
          <FleetField
            id="account-new-password"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            maxLength={20}
            disabled={busy}
            error={errors.password}
            {...register("password")}
          />
          <FleetField
            id="account-confirm-password"
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            maxLength={20}
            disabled={busy}
            error={errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {error && (
            <p role="alert" className="tg-notice">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
    </section>
  );
}

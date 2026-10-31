"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import { AccountTwoFactorSchema } from "@/lib/validators/account";

export function AccountTwoFactorControl({
  enabled,
  onSaved,
}: {
  enabled: boolean;
  onSaved: (enabled: boolean) => void;
}) {
  const { busy, setBusy } = useBranchWorkspace();
  const [selected, setSelected] = useState(enabled);
  const [working, setWorking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(false);
  useEffect(() => setSelected(enabled), [enabled]);
  async function run(readOnly = false) {
    if (active.current || busy || (!readOnly && (uncertain || selected === enabled))) return;
    active.current = true;
    setWorking(true);
    setBusy(true);
    setError("");
    setNotice("");
    let ambiguous = true;
    try {
      const response = await fetch(
        "/api/account/two-factor",
        readOnly
          ? { cache: "no-store" }
          : {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ twoFactorEnabled: selected }),
            },
      );
      ambiguous = response.ok || response.status >= 500;
      const result = AccountTwoFactorSchema.safeParse(await readFleetResponse(response));
      if (!result.success || (!readOnly && result.data.twoFactorEnabled !== selected))
        throw new Error("La respuesta no confirma el estado solicitado de 2FA.");
      setSelected(result.data.twoFactorEnabled);
      onSaved(result.data.twoFactorEnabled);
      setUncertain(false);
      setNotice(
        readOnly
          ? `Estado consultado: 2FA ${result.data.twoFactorEnabled ? "activado" : "desactivado"}.`
          : `Autenticación de dos factores ${result.data.twoFactorEnabled ? "activada" : "desactivada"}.`,
      );
    } catch (cause) {
      if (!readOnly) setUncertain(ambiguous);
      setError(
        (cause instanceof Error ? cause.message : "No se pudo confirmar el 2FA.") +
          (!readOnly && ambiguous
            ? " El cambio podría haberse registrado. Consulta el estado antes de volver a guardarlo."
            : ""),
      );
    } finally {
      active.current = false;
      setWorking(false);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <label
        htmlFor="driver-two-factor"
        className="flex cursor-pointer items-start gap-3 text-sm font-medium"
      >
        <input
          id="driver-two-factor"
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tg-green)]"
          disabled={busy || uncertain}
          checked={selected}
          onChange={(event) => setSelected(event.target.checked)}
          aria-describedby="driver-two-factor-help"
        />
        Activar autenticación de dos factores (2FA)
      </label>
      <p id="driver-two-factor-help" className="text-sm leading-6 text-[var(--tg-muted)]">
        Al activarla, recibirás un código por correo para completar cada inicio de sesión. Esta
        preferencia se guarda por separado de tus datos personales.
      </p>
      {error && (
        <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-[var(--tg-green)]">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy || uncertain || selected === enabled}
          onClick={() => void run()}
        >
          {working ? "Consultando…" : "Guardar 2FA"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void run(true)}>
          Consultar estado de 2FA
        </Button>
      </div>
    </div>
  );
}

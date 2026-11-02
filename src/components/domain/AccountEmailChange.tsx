"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { identityPost } from "@/lib/identity-ui";
import { IdentityEmailRequestSchema, IdentityEmailPendingSchema } from "@/lib/validators/auth";

export function AccountEmailChange({ currentEmail }: { currentEmail: string }) {
  const { busy, setBusy } = useBranchWorkspace();
  const sending = useRef(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current || busy) return;
    const parsed = IdentityEmailRequestSchema.safeParse({ email });
    if (!parsed.success || parsed.data.email.toLowerCase() === currentEmail.toLowerCase()) {
      setError("Ingresa un correo válido diferente al actual.");
      return;
    }
    sending.current = true;
    setBusy(true);
    setPending(false);
    setError("");
    try {
      await identityPost("/api/account/email-change", parsed.data, IdentityEmailPendingSchema);
      setPending(true);
      setEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar la solicitud.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Cambio de correo electrónico"
      className="space-y-4 rounded-2xl border border-[var(--tg-line)] bg-[var(--color-surface)] p-5"
    >
      <h3 className="font-semibold">Cambiar correo electrónico</h3>
      <p className="break-words text-sm text-[var(--tg-muted)]">
        Correo actual: {currentEmail}. Se conserva hasta confirmar la nueva dirección. El cambio
        mantiene tu NIT y tus compras.
      </p>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="account-new-email">Nuevo correo electrónico</Label>
          <Input
            id="account-new-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {pending && (
          <p role="status" className="tg-notice">
            Cambio pendiente de verificación. Abre el enlace enviado al nuevo correo para
            confirmarlo. Tu correo actual sigue vigente.
          </p>
        )}
        {error && (
          <p role="alert" className="tg-notice">
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" disabled={busy}>
          {sending.current ? "Solicitando…" : "Solicitar cambio de correo"}
        </Button>
      </form>
    </section>
  );
}

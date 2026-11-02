"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthFrame } from "@/components/layout/AuthFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identityPost } from "@/lib/identity-ui";
import {
  IdentityEmailTokenSchema,
  IdentityEmailRequestSchema,
  IdentityEmailConfirmedSchema,
  IdentityEmailAcceptedSchema,
} from "@/lib/validators/auth";

export function IdentityEmailVerification({
  mode,
}: {
  mode: "confirm" | "resend" | "confirm-change";
}) {
  const params = useSearchParams();
  const [token] = useState(() =>
    params.getAll("token").length === 1 ? (params.get("token") ?? "") : "",
  );
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  useEffect(() => {
    // GET solo presenta el formulario; no confirma ni consume el enlace.
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);
  const resend = mode === "resend";
  const validToken = IdentityEmailTokenSchema.safeParse({ token }).success;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current || done) return;
    const parsed = (resend ? IdentityEmailRequestSchema : IdentityEmailTokenSchema).safeParse(
      resend ? { email } : { token },
    );
    if (!parsed.success) {
      setError(
        resend
          ? "Ingresa un correo válido."
          : "Abre un enlace de verificación válido desde tu correo.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      if (resend)
        await identityPost(`/api/auth/email/${mode}`, parsed.data, IdentityEmailAcceptedSchema);
      else await identityPost(`/api/auth/email/${mode}`, parsed.data, IdentityEmailConfirmedSchema);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar la operación.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={resend ? "Revisa tu correo." : "Tu correo, confirmado por ti."}
      description="La verificación de tu cuenta conserva tus compras y tu NIT."
    >
      <h2 className="tg-card-title">
        {resend
          ? "Solicitar verificación"
          : mode === "confirm-change"
            ? "Confirmar nuevo correo"
            : "Verificar correo"}
      </h2>
      {done ? (
        <div className="space-y-5">
          <p role="status" className="tg-notice">
            {resend
              ? "Si hay una cuenta pendiente de verificación para esa dirección, recibirás un nuevo enlace. Revisa también tu carpeta de correo no deseado."
              : mode === "confirm-change"
                ? "El nuevo correo fue verificado. Úsalo en tus próximos inicios de sesión; tu NIT e historial se conservan."
                : "Tu correo fue verificado. Ya puedes iniciar sesión."}
          </p>
          <Link href="/login" className="underline">
            Ir al inicio de sesión
          </Link>
          {resend && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDone(false);
                setEmail("");
              }}
            >
              Usar otro correo
            </Button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          noValidate
          className="space-y-5"
        >
          <p className="tg-card-description">
            {resend
              ? "Ingresa el correo utilizado al registrarte. Esta solicitud no crea otra cuenta."
              : "Pulsa el botón para confirmar este enlace. Abrir la página no modifica tu cuenta."}
          </p>
          {resend && (
            <div className="space-y-2">
              <Label htmlFor="verification-email">Correo electrónico</Label>
              <Input
                id="verification-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          )}
          {!resend && !validToken && (
            <p role="alert" className="tg-notice">
              Falta un enlace válido. Abre el que recibiste por correo.
            </p>
          )}
          {error && (
            <p role="alert" className="tg-notice">
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={busy || (!resend && !validToken)}>
            {busy ? "Procesando…" : resend ? "Solicitar enlace" : "Confirmar correo"}
          </Button>
          {mode !== "confirm-change" && !resend && (
            <Link href="/auth/resend-verification" className="block underline">
              Solicitar otro enlace
            </Link>
          )}
          {mode === "confirm-change" && (
            <Link href="/mi-cuenta" className="block underline">
              Solicitar cambio desde mi perfil
            </Link>
          )}
          <Link href="/login" className="block underline">
            Volver al inicio de sesión
          </Link>
        </form>
      )}
    </AuthFrame>
  );
}

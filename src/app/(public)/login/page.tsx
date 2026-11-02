"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import { identityPost } from "@/lib/identity-ui";
import {
  TransportLoginRequestSchema,
  TransportTfaRequestSchema,
  TransportLoginUiResponseSchema,
} from "@/lib/validators/auth";
import type { TransportLoginRequest } from "@/types/auth";

export default function LoginPage(): React.ReactElement {
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  // El desafío vive solo en memoria. La contraseña se descarta al pasar al A2F.
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransportLoginRequest>({ resolver: zodResolver(TransportLoginRequestSchema) });

  async function authenticate(data: TransportLoginRequest | { challengeId: string; code: string }) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await identityPost("/api/auth/login", data, TransportLoginUiResponseSchema);
      if (result.status === "authenticated") {
        window.location.assign("/");
        return;
      }
      if (result.status === "two_factor_required") {
        reset({ email: "", password: "" });
        setVisible(false);
        setChallengeId(result.challengeId);
        setCode("");
        setMessage(
          "Ingresa el código enviado a tu correo. Si venció, vuelve a iniciar sesión para solicitar otro desafío.",
        );
      } else {
        setMessage(result.detail);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo completar el inicio de sesión.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={challengeId ? "Un paso más y estás dentro." : "Qué bueno tenerte de vuelta."}
      description="Tu cuenta es el punto de partida para tu próximo destino."
    >
      <div data-testid="login-page">
        <h2 className="tg-card-title">{challengeId ? "Confirma tu código" : "Inicia sesión"}</h2>
        <p className="tg-card-description">
          {challengeId
            ? "El código es temporal y solo puede utilizarse una vez."
            : "Ingresa con tu correo y contraseña."}
        </p>
        {challengeId ? (
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = TransportTfaRequestSchema.safeParse({ challengeId, code });
              if (!parsed.success) {
                setMessage("Ingresa un código de verificación válido.");
                return;
              }
              void authenticate(parsed.data);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
              <Input
                id="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                maxLength={10}
                disabled={busy}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            {message && (
              <p role="status" className="tg-notice">
                {message}
              </p>
            )}
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Verificando…" : "Verificar código"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full"
              onClick={() => {
                setChallengeId(null);
                setCode("");
                setMessage("");
              }}
            >
              Volver al inicio de sesión
            </Button>
          </form>
        ) : (
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              void handleSubmit(authenticate)(event);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tu@correo.com"
                disabled={busy}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                data-testid="login-email"
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={busy}
                  className="pr-12"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  data-testid="login-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setVisible((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={visible}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            {message && (
              <p role="status" className="tg-notice">
                {message}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full"
              data-testid="login-submit"
            >
              {busy ? "Verificando…" : "Iniciar sesión"}
            </Button>
          </form>
        )}
        {!challengeId && (
          <>
            <p className="tg-form-links">
              <Link href="/forgot-password">Olvidé mi contraseña</Link>
              <Link href="/register">Crear cuenta ↗</Link>
            </p>
            <p className="tg-back-link">
              <Link href="/auth/resend-verification">¿Falta verificar tu correo?</Link>
            </p>
          </>
        )}
      </div>
    </AuthFrame>
  );
}

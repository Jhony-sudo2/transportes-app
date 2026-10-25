"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import {
  TransportPasswordTokenSchema,
  TransportResetPasswordSchema,
  type TransportResetPassword,
} from "@/lib/validators/auth";

export function PasswordSetupForm({ mode }: { mode: "first-login" | "recovery" }) {
  const firstLogin = mode === "first-login";
  const initialized = useRef(false);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransportResetPassword>({ resolver: zodResolver(TransportResetPasswordSchema) });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const url = new URL(window.location.href);
    const tokens = url.searchParams.getAll("token");
    const token = tokens.length === 1 ? (tokens[0] ?? "") : "";
    const valid = TransportPasswordTokenSchema.safeParse(token).success;
    if (tokens.length) {
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    if (valid) {
      setValue("token", token);
      setHasToken(true);
    } else if (firstLogin || tokens.length) {
      setLinkError(
        tokens.length
          ? "El enlace no es válido. Solicita un nuevo enlace para establecer tu contraseña."
          : "Abre el enlace de bienvenida que recibiste por correo para establecer tu contraseña.",
      );
    }
    setReady(true);
  }, [firstLogin, setValue]);

  async function submit(data: TransportResetPassword) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setMessage(
          result &&
            typeof result === "object" &&
            "detail" in result &&
            typeof result.detail === "string"
            ? result.detail
            : "No se pudo guardar la contraseña. Solicita un nuevo enlace e inténtalo de nuevo.",
        );
        return;
      }
      if (
        !result ||
        typeof result !== "object" ||
        !("status" in result) ||
        result.status !== "reset"
      )
        throw new Error("No se pudo confirmar el cambio.");
      reset();
      setDone(true);
      setMessage(
        firstLogin
          ? "Tu contraseña está lista. Ya puedes iniciar sesión con tu correo y tu nueva contraseña."
          : "detail" in result && typeof result.detail === "string"
            ? result.detail
            : "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
      );
    } catch {
      setMessage(
        "No se pudo confirmar el cambio. Intenta iniciar sesión o solicita un nuevo enlace antes de repetirlo.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={firstLogin ? "Tu cuenta empieza aquí." : "Un nuevo comienzo."}
      description={
        firstLogin
          ? "Establece tu contraseña para ingresar a Transportes Guatemala."
          : "Actualiza tu contraseña y vuelve a tu cuenta."
      }
    >
      <h2 className="tg-card-title">
        {firstLogin ? (done ? "Contraseña creada" : "Crea tu contraseña") : "Tu nueva contraseña"}
      </h2>
      {!ready ? (
        <p role="status">{firstLogin ? "Preparando tu cuenta…" : "Preparando recuperación…"}</p>
      ) : done ? (
        <div className="space-y-5">
          <p role="status">{message}</p>
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      ) : firstLogin && !hasToken ? (
        <div className="space-y-5">
          <p role="alert" className="tg-notice">
            {linkError}
          </p>
          <Button asChild>
            <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
          </Button>
          <Link href="/login" className="tg-back-link">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="tg-card-description">
            {firstLogin
              ? "Este será tu acceso a la plataforma. Elige una contraseña de 6 a 20 caracteres y confírmala."
              : "Elige una contraseña de 6 a 20 caracteres."}
          </p>
          {linkError && (
            <p role="alert" className="tg-notice">
              {linkError}
            </p>
          )}
          <form
            onSubmit={(event) => {
              void handleSubmit(submit)(event);
            }}
            noValidate
            className="space-y-4"
          >
            {!hasToken && (
              <div className="space-y-2">
                <Label htmlFor="recovery-token">Token de recuperación</Label>
                <Input
                  id="recovery-token"
                  type="password"
                  autoComplete="off"
                  disabled={busy}
                  {...register("token")}
                />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Abre el enlace del correo o pega su token completo. No es el código de 2FA.
                </p>
              </div>
            )}
            {errors.token && (
              <p role="alert" className="text-sm text-red-600">
                {errors.token.message}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                maxLength={20}
                disabled={busy}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "new-password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="new-password-error" role="alert" className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                maxLength={20}
                disabled={busy}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p id="confirm-password-error" role="alert" className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {message && (
              <p role="alert" className="tg-notice">
                {message}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? "Guardando…"
                : firstLogin
                  ? "Establecer contraseña"
                  : "Guardar nueva contraseña"}
            </Button>
          </form>
          <Link href="/forgot-password" className="tg-back-link">
            Solicitar un nuevo enlace
          </Link>
        </>
      )}
    </AuthFrame>
  );
}

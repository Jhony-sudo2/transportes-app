"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import { TransportResetPasswordSchema, type TransportResetPassword } from "@/lib/validators/auth";
export default function ResetPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransportResetPassword>({ resolver: zodResolver(TransportResetPasswordSchema) });
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") ?? "";
    if (token) {
      setValue("token", token);
      setHasToken(true);
      window.history.replaceState(null, "", url.pathname);
    }
    setReady(true);
  }, [setValue]);
  async function submit(data: TransportResetPassword) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { detail?: string; status?: string };
      setMessage(result.detail ?? "No se pudo completar la solicitud.");
      if (response.ok && result.status === "reset") {
        reset();
        setDone(true);
      }
    } catch {
      setMessage("No se pudo confirmar el cambio. Intenta iniciar sesión antes de repetirlo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Un nuevo comienzo."
      description="Actualiza tu contraseña y vuelve a tu cuenta."
    >
      <h2 className="tg-card-title">Tu nueva contraseña</h2>
      {!ready ? (
        <p role="status">Preparando recuperación…</p>
      ) : done ? (
        <div className="space-y-5">
          <p role="status">{message}</p>
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="tg-card-description">Elige una contraseña de 6 a 20 caracteres.</p>
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
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-sm text-red-600">
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
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p role="alert" className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {message && (
              <p role="status" className="tg-notice">
                {message}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Guardando…" : "Guardar nueva contraseña"}
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

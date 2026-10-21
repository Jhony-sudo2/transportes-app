"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import { TransportForgotPasswordSchema, type TransportForgotPassword } from "@/lib/validators/auth";
export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransportForgotPassword>({ resolver: zodResolver(TransportForgotPasswordSchema) });
  async function submit(data: TransportForgotPassword) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { detail?: string; status?: string };
      setMessage(result.detail ?? "No se pudo completar la solicitud.");
      if (response.ok && result.status === "sent") setSent(true);
    } catch {
      setMessage("No se pudo conectar al servidor. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Volvamos a conectar."
      description="Recupera el acceso a tu cuenta en unos pasos."
    >
      <h2 className="tg-card-title">¿Olvidaste tu contraseña?</h2>
      <p className="tg-card-description">
        Te enviaremos un enlace a tu correo para elegir una nueva.
      </p>
      <form
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
        noValidate
        className="space-y-4"
      >
        <Label htmlFor="recovery-email">Correo electrónico</Label>
        <Input
          id="recovery-email"
          type="email"
          autoComplete="email"
          disabled={busy}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "recovery-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="recovery-email-error" role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
        {message && (
          <p role="status" className="tg-notice">
            {message}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Enviando…" : sent ? "Solicitar otro enlace" : "Enviar enlace"}
        </Button>
      </form>
      <Link href="/login" className="tg-back-link">
        Volver al inicio de sesión
      </Link>
    </AuthFrame>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import { TransportLoginRequestSchema, type TransportLoginRequest } from "@/lib/validators/auth";
export default function LoginPage(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    unregister,
    getValues,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<TransportLoginRequest>({ resolver: zodResolver(TransportLoginRequestSchema) });
  async function onSubmit(data: TransportLoginRequest): Promise<void> {
    if (twoFactor && !data.code) {
      setError("code", { message: "Ingresa el código de verificación" });
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as { status?: string; detail?: string };
      if (!response.ok) {
        setMessage(body.detail ?? "No se pudo iniciar sesión.");
        return;
      }
      if (body.status === "two_factor_required") {
        setTwoFactor(true);
        setMessage("Ingresa el código enviado a tu correo electrónico.");
        return;
      }
      if (body.status === "password_reset_required") {
        setMessage(body.detail ?? "Tu cuenta requiere cambiar la contraseña.");
        return;
      }
      if (body.status !== "authenticated") {
        setMessage("El servidor no confirmó el inicio de sesión.");
        return;
      }
      window.location.assign("/");
    } catch {
      setMessage("No se pudo conectar al servidor. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }
  async function resendCode(): Promise<void> {
    setIsLoading(true);
    setMessage("");
    try {
      const { email, password } = getValues();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as { status?: string; detail?: string };
      if (!response.ok) {
        setMessage(body.detail ?? "No se pudo reenviar el código.");
        return;
      }
      if (body.status === "authenticated") {
        window.location.assign("/");
        return;
      }
      if (body.status !== "two_factor_required") {
        setMessage(body.detail ?? "No se pudo reenviar el código.");
        return;
      }
      setValue("code", "");
      clearErrors("code");
      setMessage(
        "Se solicitó un nuevo código por correo. Usa el más reciente; vence en 5 minutos.",
      );
    } catch {
      setMessage("No se pudo reenviar el código. Inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <AuthFrame
      title={twoFactor ? "Un paso más y estás dentro." : "Qué bueno tenerte de vuelta."}
      description="Tu cuenta es el punto de partida para tu próximo destino."
    >
      <div data-testid="login-page">
        <h2 className="tg-card-title">{twoFactor ? "Verifica tu correo" : "Inicia sesión"}</h2>
        <p className="tg-card-description">
          {twoFactor
            ? "Ingresa el código que enviamos a tu correo. Tiene una vigencia de 5 minutos."
            : "Ingresa con tu correo y contraseña."}
        </p>{" "}
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          noValidate
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="tu@correo.com"
              readOnly={twoFactor}
              disabled={isLoading}
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
                readOnly={twoFactor}
                disabled={isLoading}
                className="pr-12"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                data-testid="login-password"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
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
          {twoFactor && (
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
              <Input
                id="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                disabled={isLoading}
                maxLength={10}
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? "code-error" : undefined}
                {...register("code")}
              />
              {errors.code && (
                <p id="code-error" role="alert" className="text-sm text-red-600">
                  {errors.code.message}
                </p>
              )}
            </div>
          )}
          {message && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg bg-[var(--color-surface)] p-3 text-sm"
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-h-11 w-full"
            data-testid="login-submit"
          >
            {isLoading ? "Verificando…" : twoFactor ? "Verificar código" : "Iniciar sesión"}
          </Button>
          {twoFactor && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full"
              onClick={() => {
                setTwoFactor(false);
                unregister("code");
                setMessage("");
              }}
            >
              Volver al inicio de sesión
            </Button>
          )}
          {twoFactor && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full"
              onClick={() => {
                void resendCode();
              }}
            >
              Reenviar código
            </Button>
          )}
        </form>
        {!twoFactor && (
          <p className="tg-form-links">
            <Link href="/forgot-password">Olvidé mi contraseña</Link>
            <Link href="/register">
              Crear cuenta <span aria-hidden="true">↗</span>
            </Link>
          </p>
        )}
      </div>
    </AuthFrame>
  );
}

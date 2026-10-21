"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import {
  TransportRegisterRequestSchema,
  type TransportRegisterRequest,
} from "@/lib/validators/auth";
const fields: {
  name: FieldPath<TransportRegisterRequest>;
  label: string;
  type: string;
  autoComplete: string;
  maxLength: number;
}[] = [
  {
    name: "person.name",
    label: "Nombre",
    type: "text",
    autoComplete: "given-name",
    maxLength: 255,
  },
  {
    name: "person.lastName",
    label: "Apellido",
    type: "text",
    autoComplete: "family-name",
    maxLength: 255,
  },
  { name: "person.dpi", label: "DPI", type: "text", autoComplete: "off", maxLength: 50 },
  { name: "person.nit", label: "NIT", type: "text", autoComplete: "off", maxLength: 50 },
  { name: "person.phone", label: "Teléfono", type: "tel", autoComplete: "tel", maxLength: 20 },
  {
    name: "person.adress",
    label: "Dirección",
    type: "text",
    autoComplete: "street-address",
    maxLength: 100,
  },
  {
    name: "credentials.email",
    label: "Correo electrónico",
    type: "email",
    autoComplete: "email",
    maxLength: 255,
  },
  {
    name: "credentials.password",
    label: "Contraseña",
    type: "password",
    autoComplete: "new-password",
    maxLength: 100,
  },
  {
    name: "credentials.confirmPassword",
    label: "Confirmar contraseña",
    type: "password",
    autoComplete: "new-password",
    maxLength: 100,
  },
];
export default function RegisterPage(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, getFieldState, formState, reset } =
    useForm<TransportRegisterRequest>({ resolver: zodResolver(TransportRegisterRequestSchema) });
  async function onSubmit(data: TransportRegisterRequest): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { status?: string; detail?: string };
      if (!response.ok) {
        setMessage(result.detail ?? "No se pudo crear la cuenta.");
        return;
      }
      if (result.status !== "registered") {
        setMessage("El servidor no confirmó el registro.");
        return;
      }
      reset();
      setSuccess(true);
    } catch {
      setMessage(
        "No se pudo confirmar el registro. Comprueba tu conexión e intenta iniciar sesión antes de repetirlo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      wide
      title="El viaje comienza contigo."
      description="Crea tu cuenta y conecta con Transportes Guatemala."
    >
      <div data-testid="register-page">
        <h2 className="tg-card-title">
          {success ? "Ya eres parte del camino." : "Crea tu cuenta"}
        </h2>
        {success ? (
          <div className="space-y-5">
            <p role="status">
              Tu registro se completó correctamente. Inicia sesión con tu correo y contraseña.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="tg-card-description">
              Tus datos personales y de acceso, en un solo lugar.
            </p>{" "}
            <form
              onSubmit={(e) => {
                void handleSubmit(onSubmit)(e);
              }}
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const error = getFieldState(field.name, formState).error;
                  const id = field.name.replace(".", "-");
                  return (
                    <div
                      key={field.name}
                      className={
                        field.name === "person.adress" || field.name === "credentials.email"
                          ? "space-y-2 sm:col-span-2"
                          : "space-y-2"
                      }
                    >
                      <Label htmlFor={id}>{field.label}</Label>
                      <Input
                        id={id}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        maxLength={field.maxLength}
                        disabled={busy}
                        required
                        aria-invalid={!!error}
                        aria-describedby={
                          error
                            ? `${id}-error`
                            : field.name === "credentials.password"
                              ? "password-hint"
                              : undefined
                        }
                        data-testid={`register-${id}`}
                        {...register(field.name)}
                      />
                      {field.name === "credentials.password" && (
                        <p
                          id="password-hint"
                          className="text-xs text-[var(--color-text-secondary)]"
                        >
                          Entre 8 y 100 caracteres.
                        </p>
                      )}
                      {error && (
                        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
                          {error.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {message && (
                <p role="alert" className="mt-4 rounded-lg bg-[var(--color-surface)] p-3 text-sm">
                  {message}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="mt-6 min-h-11 w-full"
                data-testid="register-submit"
              >
                {busy ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </form>
            <p className="tg-back-link">
              ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
            </p>
          </>
        )}
      </div>
    </AuthFrame>
  );
}

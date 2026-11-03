"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/AuthFrame";
import {
  TransportRegisterRequestSchema,
  TransportRegisterUiResponseSchema,
} from "@/lib/validators/auth";
import type { TransportRegisterRequest } from "@/types/auth";
import { identityPost } from "@/lib/identity-ui";
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
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [prefilledNit, setPrefilledNit] = useState(false);
  const { register, handleSubmit, getFieldState, formState, reset, setValue } =
    useForm<TransportRegisterRequest>({ resolver: zodResolver(TransportRegisterRequestSchema) });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const single = (key: string) => (params.getAll(key).length === 1 ? params.get(key) : null);
    const person = TransportRegisterRequestSchema.shape.person.shape;
    const name = person.name.safeParse(single("name"));
    const email = TransportRegisterRequestSchema.shape.credentials
      .innerType()
      .shape.email.safeParse(single("email"));
    const nit = person.nit.safeParse(single("nit"));
    if (name.success) setValue("person.name", name.data);
    if (email.success) setValue("credentials.email", email.data);
    if (nit.success) {
      setValue("person.nit", nit.data);
      setPrefilledNit(true);
    }
  }, [setValue]);
  async function onSubmit(data: TransportRegisterRequest): Promise<void> {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    try {
      await identityPost("/api/users/register", data, TransportRegisterUiResponseSchema);
      reset();
      setSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el registro. Revisa tu correo antes de repetirlo.",
      );
    } finally {
      sending.current = false;
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
        <h2 className="tg-card-title">{success ? "Confirma tu correo." : "Crea tu cuenta"}</h2>
        {success ? (
          <div className="space-y-5">
            <p role="status">
              Tu cuenta fue creada. Abre el enlace de verificación que recibirás por correo para
              completar el registro. Tus compras con el mismo NIT quedarán vinculadas a tu
              cuenta.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Link href="/auth/resend-verification" className="block text-center underline">
              Solicitar otro enlace de verificación
            </Link>
          </div>
        ) : (
          <>
            <p className="tg-card-description">
              Usa tu NIT personal para recuperar las compras realizadas con él. El NIT será
              permanente; deberás verificar tu correo.
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
                        readOnly={field.name === "person.nit" && prefilledNit}
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
                          Entre 12 y 100 caracteres.
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

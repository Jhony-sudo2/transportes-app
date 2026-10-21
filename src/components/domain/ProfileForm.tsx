"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateUserSchema, type UpdateUserData } from "@/lib/validators/user";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface ProfileFormProps {
  userId: string;
  initialValues: {
    email: string;
    fullName: string;
    organization: string;
    phone: string;
    personalId: string;
  };
}

export function ProfileForm({ userId, initialValues }: ProfileFormProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserData>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      fullName: initialValues.fullName,
      organization: initialValues.organization,
      phone: initialValues.phone,
    },
  });

  async function onSubmit(data: UpdateUserData): Promise<void> {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const errorParsed = ProblemDetailSchema.safeParse(body);
        const code = errorParsed.success ? errorParsed.data.code : "system.internal_error";
        const message =
          ERROR_MESSAGES[code] ?? ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.";
        toast.error(message);
        return;
      }

      toast.success("Perfil actualizado correctamente.");
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card
      className="animate-fade-in-up border-[var(--color-border)] bg-[var(--color-white)]"
      data-testid="profile-form"
    >
      <CardHeader>
        <CardTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
          Informacion personal
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          {/* Email — read-only */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email" className="font-secondary text-sm text-[var(--color-text-primary)]">
              Correo electronico
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={initialValues.email}
              readOnly
              disabled
              className="cursor-not-allowed opacity-60"
              aria-label="Correo electronico (no editable)"
            />
            <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
              El correo electronico no se puede modificar.
            </p>
          </div>

          {/* Personal ID — read-only */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-personalid" className="font-secondary text-sm text-[var(--color-text-primary)]">
              Identificacion personal
            </Label>
            <Input
              id="profile-personalid"
              type="text"
              value={initialValues.personalId}
              readOnly
              disabled
              className="cursor-not-allowed opacity-60"
              aria-label="Identificacion personal (no editable)"
            />
            <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
              La identificacion personal no se puede modificar.
            </p>
          </div>

          {/* Full name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-fullname"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Nombre completo
            </Label>
            <Input
              id="profile-fullname"
              type="text"
              disabled={isLoading}
              data-testid="profile-fullname-input"
              aria-invalid={errors.fullName !== undefined}
              {...register("fullName")}
            />
            {errors.fullName !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Organization */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-organization"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Organizacion
            </Label>
            <Input
              id="profile-organization"
              type="text"
              disabled={isLoading}
              data-testid="profile-organization-input"
              aria-invalid={errors.organization !== undefined}
              {...register("organization")}
            />
            {errors.organization !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.organization.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-phone"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Telefono
            </Label>
            <Input
              id="profile-phone"
              type="tel"
              disabled={isLoading}
              data-testid="profile-phone-input"
              aria-invalid={errors.phone !== undefined}
              {...register("phone")}
            />
            {errors.phone !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.phone.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="mt-2 min-h-[44px] w-full transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            data-testid="profile-save-button"
          >
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FleetField } from "./FleetField";
import { DriverProfilePhoto } from "./DriverProfilePhoto";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import { DriverOperationIdSchema, driverPhotoError } from "@/lib/validators/fleet-resources";
import {
  AccountProfileSchema,
  AccountProfileRequestSchema,
  DriverProfileRequestSchema,
  AccountProfileOperationSchema,
  type AccountProfile,
  type AccountProfileRequest,
} from "@/lib/validators/account";
import type { z } from "zod";

function values(profile: AccountProfile): AccountProfileRequest {
  return {
    name: profile.user.name,
    lastName: profile.user.lastName,
    email: profile.user.email,
    nit: profile.user.nit ?? "",
    phone: profile.user.phone ?? "",
    adress: profile.user.adress ?? "",
    dpi: profile.user.dpi ?? "",
  };
}
async function loadProfile(userId: number, signal?: AbortSignal) {
  const profile = AccountProfileSchema.parse(
    await readFleetResponse(
      await fetch("/api/account/profile", { cache: "no-store", ...(signal ? { signal } : {}) }),
    ),
  );
  if (profile.user.id !== userId) throw new Error("El perfil recibido no corresponde a tu cuenta.");
  return profile;
}
function operationUrl(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("operationId", id);
  window.history.replaceState(null, "", url.pathname + url.search);
}
type Operation = z.infer<typeof AccountProfileOperationSchema>;
export function AccountProfileForm({
  initialProfile,
  initialOperationId,
}: {
  initialProfile: AccountProfile;
  initialOperationId?: string | undefined;
}) {
  const isDriver = initialProfile.user.role.name === "DRIVER";
  const router = useRouter();
  const { busy, setBusy } = useBranchWorkspace();
  const sending = useRef(false);
  const [profile, setProfile] = useState(initialProfile);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoError = photo ? driverPhotoError(photo) : null;
  const [operationId, setOperationId] = useState<string | null>(() => {
    const id = initialProfile.driver?.pendingOperationId ?? initialOperationId;
    return isDriver && DriverOperationIdSchema.safeParse(id).success ? (id ?? null) : null;
  });
  const [operation, setOperation] = useState<Operation | null>(null);
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountProfileRequest>({
    resolver: zodResolver(isDriver ? DriverProfileRequestSchema : AccountProfileRequestSchema),
    defaultValues: values(initialProfile),
  });
  const refresh = useCallback(
    (signal?: AbortSignal) => loadProfile(initialProfile.user.id, signal),
    [initialProfile.user.id],
  );
  useEffect(() => {
    if (!operationId || !isDriver) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      setChecking(true);
      setError("");
      try {
        const result = AccountProfileOperationSchema.parse(
          await readFleetResponse(
            await fetch(`/api/account/profile/operations/${operationId}`, {
              cache: "no-store",
              signal: controller.signal,
            }),
          ),
        );
        if (result.operationId !== operationId || result.driverId !== initialProfile.driver?.id)
          throw new Error("La respuesta no corresponde al cambio de tu perfil.");
        if (controller.signal.aborted) return;
        setOperation(result);
        if (result.status === "PENDING") {
          if (++attempts < 12) timer = setTimeout(() => void check(), 5000);
        } else {
          const current = await refresh(controller.signal);
          if (controller.signal.aborted) return;
          setProfile(current);
          setPhoto(null);
          if (result.status === "COMPLETED") {
            reset(values(current));
            setNotice("Tus datos fueron actualizados y confirmados.");
            router.refresh();
          } else {
            setNotice("");
            setError(
              result.failureReason ||
                current.driver?.updateFailureReason ||
                "La actualización fue rechazada. Revisa tus datos e inténtalo de nuevo.",
            );
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "No se pudo consultar el cambio de tu perfil.",
          );
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    void check();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [operationId, isDriver, initialProfile.driver?.id, refresh, reset, retry, router]);

  const pending =
    !!profile.driver?.pendingOperationId ||
    !!(operationId && (!operation || operation.status === "PENDING"));
  async function submit(data: AccountProfileRequest) {
    if (sending.current || busy || pending || checking || photoError) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const multipart = new FormData();
      if (isDriver) {
        multipart.append(
          "request",
          new Blob([JSON.stringify(data)], { type: "application/json" }),
          "request.json",
        );
        if (photo) multipart.append("photo", photo);
      }
      const body = await readFleetResponse(
        await fetch("/api/account/profile", {
          method: "PUT",
          ...(isDriver ? {} : { headers: { "Content-Type": "application/json" } }),
          body: isDriver ? multipart : JSON.stringify(data),
        }),
      );
      if (!body || typeof body !== "object" || !("status" in body))
        throw new Error("No se pudo confirmar el cambio.");
      if (isDriver && body.status === "pending" && "operationId" in body) {
        const id = DriverOperationIdSchema.parse(body.operationId);
        setOperation(null);
        setOperationId(id);
        operationUrl(id);
        setNotice("Se recibieron tus cambios. Estamos confirmando la actualización de tu cuenta.");
      } else if (!isDriver && body.status === "updated" && "profile" in body) {
        const updated = AccountProfileSchema.parse(body.profile);
        if (updated.user.id !== initialProfile.user.id)
          throw new Error("La respuesta no corresponde a tu cuenta.");
        setProfile(updated);
        reset(values(updated));
        setNotice("Tus datos fueron actualizados correctamente.");
        router.refresh();
      } else
        throw new Error(
          "No se pudo confirmar la respuesta. Consulta tu perfil antes de volver a guardar.",
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar el cambio.");
      if (isDriver) {
        try {
          const current = await refresh();
          setProfile(current);
          if (current.driver?.pendingOperationId) {
            setOperation(null);
            setOperationId(current.driver.pendingOperationId);
            operationUrl(current.driver.pendingOperationId);
          }
        } catch {
          /* Se conserva el error de la solicitud original. */
        }
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const disabled = busy || pending || checking;
  return (
    <section className="space-y-6 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
      <div>
        <h2 className="text-xl font-semibold">Datos personales</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--tg-muted)]">
          {isDriver
            ? "Los cambios de tu perfil se mostrarán cuando estén confirmados."
            : "Actualiza tus datos de contacto y la información de tu cuenta."}
        </p>
      </div>
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {pending && (
        <div className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-500/5 p-4 text-sm">
          <p role="status">
            Actualización pendiente de confirmación. Puedes volver a esta página para consultar el
            resultado.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={checking || busy}
            onClick={() => setRetry((current) => current + 1)}
          >
            {checking ? "Consultando…" : "Consultar estado"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="tg-notice break-words">
          {error}
        </p>
      )}
      {!operation && !error && profile.driver?.updateFailureReason && (
        <p role="alert" className="tg-notice break-words">
          La última actualización fue rechazada: {profile.driver.updateFailureReason}
        </p>
      )}
      <form
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
        noValidate
        className="space-y-6"
      >
        {isDriver && (
          <DriverProfilePhoto
            currentPhoto={profile.driver?.photo}
            photo={photo}
            onChange={setPhoto}
            error={photoError}
            disabled={disabled}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <FleetField
            id="account-name"
            label="Nombre"
            autoComplete="given-name"
            maxLength={255}
            disabled={disabled}
            error={errors.name}
            {...register("name")}
          />
          <FleetField
            id="account-last-name"
            label="Apellido"
            autoComplete="family-name"
            maxLength={255}
            disabled={disabled}
            error={errors.lastName}
            {...register("lastName")}
          />
          <FleetField
            id="account-email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            maxLength={255}
            disabled={disabled}
            error={errors.email}
            {...register("email")}
          />
          <FleetField
            id="account-phone"
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            disabled={disabled}
            error={errors.phone}
            {...register("phone")}
          />
          <FleetField
            id="account-nit"
            label="NIT"
            maxLength={50}
            disabled={disabled}
            error={errors.nit}
            {...register("nit")}
          />
          <FleetField
            id="account-dpi"
            label="DPI"
            maxLength={50}
            readOnly={!isDriver}
            disabled={disabled}
            error={errors.dpi}
            {...register("dpi")}
          />
          <div className="sm:col-span-2">
            <FleetField
              id="account-address"
              label="Dirección"
              autoComplete="street-address"
              maxLength={100}
              disabled={disabled}
              error={errors.adress}
              {...register("adress")}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={disabled}>
            {busy ? "Enviando…" : isDriver ? "Enviar cambios" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              reset(values(profile));
              setPhoto(null);
              setError("");
            }}
          >
            Restaurar datos
          </Button>
        </div>
      </form>
    </section>
  );
}

"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { UserRound, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function imageUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function DriverProfilePhoto({
  currentPhoto,
  photo,
  onChange,
  error,
  disabled,
}: {
  currentPhoto?: string | undefined;
  photo: File | null;
  onChange: (photo: File | null) => void;
  error: string | null;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  useEffect(() => {
    if (!photo || error) {
      setPreview(null);
      if (!photo && input.current) input.current.value = "";
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, error]);
  const source = preview ?? imageUrl(currentPhoto);
  return (
    <section
      aria-label="Fotografía del chofer"
      className="flex flex-col gap-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-start"
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)]">
          {source && failedSource !== source ? (
            <Image
              src={source}
              width={112}
              height={112}
              unoptimized
              alt={
                preview ? "Vista previa de la nueva foto de perfil" : "Foto de perfil del chofer"
              }
              className="h-full w-full object-cover"
              onError={() => setFailedSource(source)}
            />
          ) : (
            <UserRound size={40} className="text-[var(--tg-muted)]" aria-hidden="true" />
          )}
        </div>
        <p className="text-xs text-[var(--tg-muted)]">{preview ? "Vista previa" : "Foto actual"}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Camera size={18} aria-hidden="true" />
          Foto de perfil
        </h3>
        <Label htmlFor="account-driver-photo">Nueva foto de perfil (opcional)</Label>
        <Input
          ref={input}
          id="account-driver-photo"
          type="file"
          accept="image/jpeg,image/png"
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? "account-driver-photo-help account-driver-photo-error"
              : "account-driver-photo-help"
          }
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <p id="account-driver-photo-help" className="text-xs leading-5 text-[var(--tg-muted)]">
          JPG o PNG, hasta 1 MB. Si no seleccionas una imagen, se conserva tu foto actual.
        </p>
        {error && (
          <p
            id="account-driver-photo-error"
            role="alert"
            className="text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {source && failedSource === source && (
          <p role="status" className="text-xs text-[var(--tg-muted)]">
            No se pudo cargar la imagen. Puedes seleccionar una nueva foto.
          </p>
        )}
        {photo && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Descartar nueva foto
          </Button>
        )}
      </div>
    </section>
  );
}

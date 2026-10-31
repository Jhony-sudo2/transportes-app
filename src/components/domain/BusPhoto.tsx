"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BusFront } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function BusPhoto({
  src,
  alt,
  className = "h-20 w-32",
}: {
  src?: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  let source: string | null = null;
  try {
    const url = new URL(src ?? "");
    if (["http:", "https:", "blob:"].includes(url.protocol)) source = url.href;
  } catch {
    /* Muestra la imagen de sustitución. */
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--tg-line)] bg-[var(--color-surface)] ${className}`}
    >
      {source && failed !== source ? (
        <Image
          src={source}
          alt={alt}
          width={320}
          height={180}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(source)}
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-xs text-[var(--tg-muted)]">
          <BusFront size={24} aria-hidden="true" />
          Sin imagen
        </span>
      )}
    </div>
  );
}
export function BusPhotoInput({
  currentPhoto,
  photo,
  onChange,
  error,
  disabled,
  required = false,
}: {
  currentPhoto?: string | null | undefined;
  photo: File | null;
  onChange: (photo: File | null) => void;
  error: string | null;
  disabled: boolean;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
  return (
    <section
      aria-label="Fotografía del bus"
      className="space-y-4 rounded-2xl border border-[var(--tg-line)] bg-[var(--color-surface)] p-5"
    >
      <BusPhoto
        src={preview ?? currentPhoto}
        alt={preview ? "Vista previa de la fotografía del bus" : "Fotografía actual del bus"}
        className="h-44 w-full"
      />
      <Label htmlFor="bus-photo">
        {required ? "Fotografía del bus" : "Nueva fotografía del bus (opcional)"}
      </Label>
      <Input
        ref={input}
        id="bus-photo"
        type="file"
        accept="image/jpeg,image/png"
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby="bus-photo-help"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p id="bus-photo-help" className="text-xs leading-5 text-[var(--tg-muted)]">
        JPG o PNG, hasta 1 MB.{!required && " Si no seleccionas una imagen, se conserva la actual."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
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
    </section>
  );
}

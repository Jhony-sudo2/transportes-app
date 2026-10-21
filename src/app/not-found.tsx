import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound(): React.ReactElement {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      data-testid="not-found-page"
    >
      {/* Animated 404 icon */}
      <div className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-pale-blue)]">
        <FileQuestion size={36} strokeWidth={1.5} className="text-[var(--color-primary-text)]" />
      </div>

      <div className="animate-fade-in-up flex flex-col gap-2">
        <h1 className="font-sans text-3xl font-medium text-[var(--color-text-primary-black)]">
          Pagina no encontrada
        </h1>
        <p className="mx-auto max-w-sm font-secondary text-base text-[var(--color-text-secondary)]">
          La pagina que buscas no existe o fue movida a otra ubicacion.
        </p>
      </div>

      <Button
        asChild
        className="animate-fade-in-up delay-150 gap-2"
        data-testid="not-found-home-link"
      >
        <Link href="/">
          <ArrowLeft size={16} strokeWidth={2} />
          Ir al inicio
        </Link>
      </Button>
    </div>
  );
}

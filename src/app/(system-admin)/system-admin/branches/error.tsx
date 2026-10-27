"use client";
import { Button } from "@/components/ui/button";
export default function BranchesError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl space-y-4 px-6 py-14">
      <h1 className="text-2xl font-semibold">No se pudo cargar el módulo</h1>
      <p>Comprueba la disponibilidad de los servicios e inténtalo de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}

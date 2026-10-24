"use client";
import { Button } from "@/components/ui/button";
export default function AdminUsersError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl space-y-4 px-6 py-14">
      <h1 className="text-2xl font-semibold">No se pudo verificar tu sesión</h1>
      <p>Comprueba que el gateway y el servicio de usuarios estén disponibles.</p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}

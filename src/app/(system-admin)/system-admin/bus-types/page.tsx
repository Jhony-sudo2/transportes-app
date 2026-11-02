import { BusTypesPageClient } from "@/components/domain/BusTypesPageClient";
export default function BusTypesPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
      <p className="tg-eyebrow">ADMINISTRACIÓN / TIPOS DE BUS</p>
      <h1 className="text-3xl font-semibold">Tipos de bus y tarifas.</h1>
      <BusTypesPageClient />
    </section>
  );
}

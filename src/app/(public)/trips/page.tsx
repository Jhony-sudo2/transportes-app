import { JourneyOffersClient } from "@/components/domain/JourneyOffersClient";
export default function SearchTripsPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
      <p className="tg-eyebrow">TRANSPORTES / VIAJES</p>
      <h1 className="text-3xl font-semibold">Busca tu próximo viaje</h1>
      <p>Consulta salidas, precios y asientos disponibles.</p>
      <JourneyOffersClient />
    </section>
  );
}

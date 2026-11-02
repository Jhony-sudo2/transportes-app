import { JourneyTripsClient } from "@/components/domain/JourneyTripsClient";
export default function DriverTripsPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
      <p className="tg-eyebrow">CONDUCTOR / OPERACIÓN</p>
      <h1 className="text-3xl font-semibold">Mis viajes</h1>
      <p>Consulta los viajes asignados y registra la salida y llegada con sus datos reales.</p>
      <JourneyTripsClient actor="driver" />
    </section>
  );
}

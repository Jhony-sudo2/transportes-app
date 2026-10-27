import { CustomerRefunds } from "@/components/domain/CustomerRefunds";
export default function CustomerRefundsPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <div>
        <p className="tg-eyebrow">MI CUENTA / DEVOLUCIONES</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Tus devoluciones</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          Si tu viaje se cancela, puedes recibir el importe de la factura en tu billetera o cobrarlo
          presencialmente.
        </p>
      </div>
      <CustomerRefunds />
    </section>
  );
}

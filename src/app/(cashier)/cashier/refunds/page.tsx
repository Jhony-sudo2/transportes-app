import { CashierRefunds } from "@/components/domain/CashierRefunds";
export default function CashierRefundsPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <div>
        <p className="tg-eyebrow">CAJA / DEVOLUCIONES</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Devoluciones presenciales
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          Busca la factura para atender al comprador, tenga o no una cuenta en la aplicación.
        </p>
      </div>
      <CashierRefunds />
    </section>
  );
}

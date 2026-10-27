import { CustomerPurchases } from "@/components/domain/CustomerPurchases";
export default function CustomerPurchasesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">MI CUENTA / COMPRAS</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
        Tus compras, en un lugar.
      </h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
        Abre una factura para consultar su detalle y los tickets asociados.
      </p>
      <CustomerPurchases />
    </section>
  );
}

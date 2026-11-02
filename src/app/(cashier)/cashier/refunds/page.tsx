import { CashRefunds } from "@/components/domain/CommerceRefunds";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function CashierRefundsPage() {
  const user = await requireTransportPageAccess("CAJERO");
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <div>
        <p className="tg-eyebrow">CAJA / DEVOLUCIONES</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Devoluciones presenciales
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          Consulta el código exacto del comprobante para atender al comprador, tenga o no cuenta. La
          caja pagadora puede ser distinta de la sucursal de compra.
        </p>
      </div>
      <CashRefunds userId={user.id} />
    </section>
  );
}

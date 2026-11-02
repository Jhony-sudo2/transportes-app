import { CommerceRefunds } from "@/components/domain/CommerceRefunds";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function CustomerRefundsPage() {
  const user = await requireTransportPageAccess("CUSTOMER");
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <div>
        <p className="tg-eyebrow">MI CUENTA / DEVOLUCIONES</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Tus devoluciones</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          Consulta cada derecho de devolución por boleto o alquiler. Elige billetera para un abono
          inmediato o consulta las instrucciones para cobrar en efectivo.
        </p>
      </div>
      <CommerceRefunds userId={user.id} />
    </section>
  );
}

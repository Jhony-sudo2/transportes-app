import { notFound } from "next/navigation";
import { parseInvoiceId } from "@/lib/validators/refunds";
import { RefundInvoice } from "@/components/domain/RefundInvoice";
export default async function CustomerRefundPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInvoiceId((await params).id);
  if (!id?.success) notFound();
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">MI CUENTA / DEVOLUCIÓN</p>
      <h1 className="text-3xl font-semibold tracking-tight">Factura #{id.data}</h1>
      <RefundInvoice actor="customer" invoiceId={id.data} />
    </section>
  );
}

import { notFound } from "next/navigation";
import { CommerceIdSchema } from "@/lib/validators/customer-commerce";
import { CustomerInvoiceDetail } from "@/components/domain/CustomerInvoiceDetail";
export default async function CustomerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const id = CommerceIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  return <CustomerInvoiceDetail invoiceId={id.data} />;
}

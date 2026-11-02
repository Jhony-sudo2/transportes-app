import { notFound } from "next/navigation";
import { CommerceIdSchema } from "@/lib/validators/customer-commerce";
import { CommerceReceipt } from "@/components/domain/CommerceReceipt";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function CustomerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const id = CommerceIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  const user = await requireTransportPageAccess("CUSTOMER");
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <CommerceReceipt invoiceId={id.data} userId={user.id} role="CUSTOMER" />
    </section>
  );
}

import { notFound } from "next/navigation";
import { InvoiceContactEmail } from "@/components/domain/InvoiceContactEmail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const action = (await params).action;
  if (action !== "confirm" && action !== "reject") notFound();
  const query = await searchParams;
  return (
    <section className="mx-auto max-w-2xl space-y-6 px-5 py-12">
      <h1 className="text-3xl font-semibold">
        {action === "confirm"
          ? "Confirmar correo del comprobante"
          : "Rechazar entrega del comprobante"}
      </h1>
      <InvoiceContactEmail
        action={action}
        token={typeof query["token"] === "string" ? query["token"] : ""}
      />
    </section>
  );
}

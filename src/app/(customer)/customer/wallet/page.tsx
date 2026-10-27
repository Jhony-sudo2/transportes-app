import { CustomerWallet } from "@/components/domain/CustomerWallet";
export default function CustomerWalletPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">MI CUENTA / BILLETERA</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Tu saldo, a mano.</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
        Consulta tus movimientos y agrega saldo para tus próximas compras.
      </p>
      <CustomerWallet />
    </section>
  );
}

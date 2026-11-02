import { Suspense } from "react";
import { IdentityEmailVerification } from "@/components/domain/IdentityEmailVerification";
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p role="status">Cargando verificación…</p>}>
      <IdentityEmailVerification mode="confirm" />
    </Suspense>
  );
}

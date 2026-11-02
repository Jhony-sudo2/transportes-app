import { Suspense } from "react";
import { IdentityEmailVerification } from "@/components/domain/IdentityEmailVerification";
export default function ResendVerificationPage() {
  return (
    <Suspense fallback={<p role="status">Cargando formulario…</p>}>
      <IdentityEmailVerification mode="resend" />
    </Suspense>
  );
}

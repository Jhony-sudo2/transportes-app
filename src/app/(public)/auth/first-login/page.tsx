import type { Metadata } from "next";
import { PasswordSetupForm } from "@/components/domain/PasswordSetupForm";

export const metadata: Metadata = {
  title: "Establece tu contraseña | Transportes Guatemala",
};

export default function FirstLoginPage() {
  return <PasswordSetupForm key="first-login" mode="first-login" />;
}

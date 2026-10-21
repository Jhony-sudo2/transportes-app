import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/components/domain/ProfileForm";
import { UserSchema } from "@/lib/validators/user";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function ProfilePage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/users/me`, { cache: "no-store" });

  if (res.status === 401) {
    redirect("/login");
  }

  const raw: unknown = await res.json();
  const parsed = UserSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div data-testid="profile-page" className="flex flex-col gap-6">
        <PageHeader title="Mi perfil" description="Gestiona tu informacion personal." />
        <p className="font-secondary text-sm text-[var(--color-error)]">
          Error al cargar el perfil. Intenta de nuevo mas tarde.
        </p>
      </div>
    );
  }

  const user = parsed.data;

  return (
    <div data-testid="profile-page" className="flex flex-col gap-6">
      <PageHeader
        title="Mi perfil"
        description="Gestiona tu informacion personal."
        action={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
            <User size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
        }
      />

      <div className="mx-auto w-full max-w-lg">
        <ProfileForm
          userId={user.id}
          initialValues={{
            email: user.email,
            fullName: user.fullName,
            organization: user.organization,
            phone: user.phone,
            personalId: user.personalId,
          }}
        />
      </div>
    </div>
  );
}

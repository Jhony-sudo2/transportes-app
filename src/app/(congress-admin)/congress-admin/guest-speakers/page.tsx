import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { GuestSpeakersPageClient } from "@/components/domain/GuestSpeakersPageClient";
import { UserListSchema } from "@/lib/validators/user";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function GuestSpeakersPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const res = await serverFetch(`${BASE}/api/users?role=GUEST_SPEAKER`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  const raw: unknown = await res.json();
  const parsed = UserListSchema.safeParse(raw);
  const guestSpeakers = parsed.success ? parsed.data.items : [];

  return (
    <Suspense fallback={<LoadingPage />}>
      <GuestSpeakersPageClient initialGuestSpeakers={guestSpeakers} />
    </Suspense>
  );
}

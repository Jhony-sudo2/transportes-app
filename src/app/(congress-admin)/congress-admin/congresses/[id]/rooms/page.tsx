import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { RoomsScopedPageClient } from "@/components/domain/RoomsScopedPageClient";
import { CongressSchema } from "@/lib/validators/congress";
import { RoomListSchema } from "@/lib/validators/room";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressRoomsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { id } = await params;

  const [congressRes, roomsRes] = await Promise.all([
    fetch(`${BASE}/api/congresses/${id}`, { cache: "no-store" }),
    fetch(`${BASE}/api/congresses/${id}/rooms`, { cache: "no-store" }),
  ]);

  if (congressRes.status === 401 || roomsRes.status === 401) {
    redirect("/login");
  }

  if (congressRes.status === 404) {
    redirect("/congress-admin/congresses");
  }

  const rawCongress: unknown = await congressRes.json();
  const rawRooms: unknown = await roomsRes.json();

  const parsedCongress = CongressSchema.safeParse(rawCongress);
  const parsedRooms = RoomListSchema.safeParse(rawRooms);

  const congress = parsedCongress.success ? parsedCongress.data : null;
  const rooms = parsedRooms.success ? parsedRooms.data.items : [];

  if (congress === null) {
    redirect("/congress-admin/congresses");
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <RoomsScopedPageClient
        congressId={id}
        congressName={congress.name}
        initialRooms={rooms}
      />
    </Suspense>
  );
}

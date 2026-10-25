import { AccountPage } from "@/components/domain/AccountPage";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <AccountPage
      view="profile"
      operationId={typeof query["operationId"] === "string" ? query["operationId"] : undefined}
    />
  );
}

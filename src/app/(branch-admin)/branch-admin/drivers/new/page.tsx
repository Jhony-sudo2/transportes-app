import { FleetCreatePage } from "@/components/domain/FleetCreatePage";
export default function NewDriverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FleetCreatePage kind="driver" searchParams={searchParams} />;
}

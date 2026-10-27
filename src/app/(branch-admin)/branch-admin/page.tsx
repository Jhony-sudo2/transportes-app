import { redirect } from "next/navigation";

export default function BranchAdminIndexPage(): never {
  redirect("/branch-admin/buses");
}

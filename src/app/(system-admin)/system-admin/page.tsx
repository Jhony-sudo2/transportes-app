import { redirect } from "next/navigation";

export default function SystemAdminIndexPage(): never {
  redirect("/system-admin/users");
}

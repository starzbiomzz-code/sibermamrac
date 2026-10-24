import { requireAdmin } from "@/lib/isAdmin";
import { redirect } from "next/navigation";
import AdminClient from "./client";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect(auth.redirect);

  return <AdminClient />;
}

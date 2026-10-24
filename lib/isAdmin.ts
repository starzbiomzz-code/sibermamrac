import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, redirect: "/login" as const };

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return { ok: false, redirect: "/dashboard" as const };
  return { ok: true, user };
}

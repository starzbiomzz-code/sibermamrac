import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as svc } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, userId, nominal } = await req.json();
  const admin = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await admin.from("deposits").update({ status: "approved" }).eq("id", id);
  const { data: p } = await admin.from("profiles").select("saldo").eq("id", userId).single();
  if (p) await admin.from("profiles").update({ saldo: p.saldo + nominal }).eq("id", userId);
  return NextResponse.json({ ok: true });
}

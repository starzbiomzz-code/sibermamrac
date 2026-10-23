import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const { id, userId, nominal } = await req.json();
  await sb.from("deposits").update({ status: "approved" }).eq("id", id);
  const { data: profile } = await sb.from("profiles").select("saldo").eq("id", userId).single();
  if (profile) await sb.from("profiles").update({ saldo: profile.saldo + nominal }).eq("id", userId);
  return NextResponse.json({ ok: true });
}
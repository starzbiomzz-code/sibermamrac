import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  await sb.from("deposits").update({ status: "rejected" }).eq("id", id);
  return NextResponse.json({ ok: true });
}

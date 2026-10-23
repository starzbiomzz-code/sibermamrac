import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = form.get("id") as string;
    const userId = form.get("user_id") as string;
    const nominal = parseInt(form.get("nominal") as string);

    // 1. Ubah status deposit
    const { error: err1 } = await sb.from("deposits").update({ status: "approved" }).eq("id", id);
    if (err1) throw new Error(err1.message);

    // 2. Ambil saldo user
    const { data: profile, error: err2 } = await sb.from("profiles").select("saldo").eq("id", userId).single();
    if (err2) throw new Error(err2.message);

    // 3. Tambah saldo
    if (profile) {
      const { error: err3 } = await sb.from("profiles").update({ saldo: profile.saldo + nominal }).eq("id", userId);
      if (err3) throw new Error(err3.message);
    }

    return NextResponse.redirect(new URL("/admin", req.url));
  } catch (error) {
    console.error(error);
    return new NextResponse("Gagal ACC", { status: 500 });
  }
}
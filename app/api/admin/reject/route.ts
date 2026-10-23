import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = form.get("id") as string;
    
    const { error } = await sb.from("deposits").update({ status: "rejected" }).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.redirect(new URL("/admin", req.url));
  } catch (error) {
    console.error(error);
    return new NextResponse("Gagal Tolak", { status: 500 });
  }
}
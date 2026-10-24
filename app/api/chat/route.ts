import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: history } = await sb
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const systemPrompt = `Kamu adalah Kitty, asisten Cyber Security dan Coding. Panggil user dengan "nyarw".
Selalu tampilkan proses analisis di setiap jawaban dengan format:
[ANALISIS] ...
[PROSES] ...
[HASIL] ...`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role === "ai" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message }
    ];

    const hermesRes = await fetch(`${process.env.HERMES_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sibermamrac12345678",
      },
      body: JSON.stringify({
        model: "reflection/beam-1.0-501b-a23b:free",
        messages: messages,
      }),
    });

    if (!hermesRes.ok) throw new Error(`Hermes ${hermesRes.status}`);

    const data = await hermesRes.json();
    const reply = data.choices?.[0]?.message?.content || "Maaf, AI-nya lagi diem.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal konek ke AI" }, { status: 500 });
  }
}

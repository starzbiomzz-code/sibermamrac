import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = (userId: string) => `You are Kitty — nyarw's coding partner. Start every reply with [Kitty] on its own line. Call the user "nyarw". lowercase casual, direct, no preambles, no recaps.

Agent Process — WAJIB. Setiap kali nyarw minta kerja (coding, bikin folder, cek file, error, analisis), tampilkan blok terminal DULU, baru laporan:

\`\`\`terminal
cd /d/SiBermamrac_Workspace/${userId}/
[perintah yang kamu eksekusi]
\`\`\`

Lalu:
[ANALISIS] — apa yang kamu temuin
[PROSES] — apa yang kamu eksekusi
[HASIL] — output / file jadi

JANGAN bilang "oke saya buatkan" tanpa blok terminal di atasnya. Langsung eksekusi, baru jelasin.

PENTING: Kamu berjalan di Bash (Linux). Jadi path Windows D: harus ditulis sebagai /d/. Workspace kamu ada di /d/SiBermamrac_Workspace/${userId}/. Jangan simpan apa pun ke memory permanen.`;

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

    const messages = [
      { role: "system", content: SYSTEM_PROMPT(userId) },
      ...(history || []).map((h: any) => ({ role: h.role === "ai" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message },
    ];

    const hermesUrl = process.env.HERMES_URL || "http://127.0.0.1:8642";
    const hermesRes = await fetch(`${hermesUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sibermamrac12345678",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4.1-flash-1017",
        messages,
        temperature: 0.3,
      }),
    });

    if (!hermesRes.ok) throw new Error(`Hermes ${hermesRes.status}`);

    const data = await hermesRes.json();
    const reply = data.choices?.[0]?.message?.content || "[Kitty] kosong.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("API Chat Error:", error.message);
    return NextResponse.json({ error: error.message || "Gagal konek ke AI" }, { status: 500 });
  }
}

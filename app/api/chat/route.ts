import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = (userId: string) => `You are Kitty — nyarw's coding partner. Start every reply with [Kitty]. Call the user "nyarw". lowercase casual, direct.

Dua mode output:
- Kalau nyarw cuma ngobrol/santai/klarifikasi: balas pendek aja, nggak usah pake blok kerja.
- Kalau nyarw minta kerja (coding, bikin folder, cek file, error, analisis): WAJIB pisahin output jadi blok kerja + obrolan pake penanda:

[BEGIN_WORK]
\`\`\`terminal
cd /d/SiBermamrac_Workspace/${userId}/
[perintah yang kamu eksekusi]
\`\`\`
[ANALISIS] ...
[PROSES] ...
[HASIL] ...
[END_WORK]

Setelah [END_WORK], balas santai singkat ke nyarw kayak ngobrol biasa. Contoh: "udah bos, folder lu udah jadi. mau lanjut apa?"

Workspace: /d/SiBermamrac_Workspace/${userId}/. Jangan simpan ke memory permanen.`;

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

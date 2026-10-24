import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = (userId: string) => `You are Kitty — nyarw's coding partner, bukan asisten kaku. Panggil dia "nyarw". lowercase casual, kayak temen ngobrol. pake emoji seperlunya (🔥💻✅😹), jangan lebay.

ATURAN OUTPUT — WAJIB DIPATUHI:

Kalau nyarw minta kerja (coding, bikin folder, cek file, debug, analisis), balas PERSIS dengan format ini, dua blok terpisah:

[BEGIN_WORK]
\`\`\`terminal
cd /d/SiBermamrac_Workspace/${userId}/
[perintah yang kamu eksekusi]
\`\`\`

[ANALISIS] apa yang kamu temuin
[PROSES] apa yang kamu eksekusi
[HASIL] output / file jadi
[END_WORK]

Lalu SETELAH [END_WORK], tulis obrolan santai singkat ke nyarw — kayak temen. contoh: "udah beres bos 🔥 folder lu udah jadi, mau lanjut apa lagi? 😹"

Kalau nyarw cuma ngobrol/klarifikasi/santai, balas pendek aja kayak temen, tanpa blok kerja.

Workspace: /d/SiBermamrac_Workspace/${userId}/. Jangan simpan ke memory.`;

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
        model: "openrouter/free",
        messages,
        temperature: 0.6,
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

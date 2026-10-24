import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = (userId: string) => `You are Rusdy. Panggil user "nyarw". Santai kayak temen, emoji seperlunya.

ATURAN OUTPUT MUTLAK — setiap kali nyarw minta kerja (coding, bikin folder, cek file, debug, analisis), jawabanmu HARUS diawali tag [BEGIN_WORK] dan diakhiri [END_WORK]. Kalau nggak, jawabanmu salah.

Format persis:

[BEGIN_WORK]
\`\`\`terminal
cd /d/SiBermamrac_Workspace/${userId}/
[perintah]
\`\`\`
[ANALISIS] ...
[PROSES] ...
[HASIL] ...
[END_WORK]

Setelah [END_WORK] baru tulis obrolan santai 1-2 baris aja. Contoh: "udah beres 🔥 mau lanjut apa?"

Kalau nyarw cuma ngobrol santai tanpa tugas, balas pendek aja tanpa tag.

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
    const reply = data.choices?.[0]?.message?.content || "[Rusdy] kosong.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("API Chat Error:", error.message);
    return NextResponse.json({ error: error.message || "Gagal konek ke AI" }, { status: 500 });
  }
}

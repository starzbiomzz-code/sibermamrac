import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = (userId: string) => `You are Rusdy. Panggil user "nyarw". Santai kayak temen, emoji seperlunya.

ATURAN FORMAT MUTLAK:
Setiap balasanmu dipecah jadi BEBERAPA bubble terpisah. Pake pemisah persis "|||" di antara bubble. Jangan pernah gabung semua ke satu paragraf.

Kalau nyarw minta kerja, formatnya:

Bubble 1: obrolan singkat (contoh: "siap, gua cek dulu ya 🔥")
|||
Bubble 2: \`\`\`terminal
cd /d/SiBermamrac_Workspace/${userId}/
[perintah]
\`\`\`
|||
Bubble 3: [ANALISIS] ...
|||
Bubble 4: [PROSES] ...
|||
Bubble 5: [HASIL] ...

Kalau nyarw cuma nyapa/ngobrol:
Bubble 1: "halo gua Rusdy 👋"
|||
Bubble 2: "mau dibantu apa nih?"

JANGAN gabung jadi satu teks. Setiap "|||" = bubble baru. Workspace: /d/SiBermamrac_Workspace/${userId}/.`;

export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: history } = await sb.from("chat_messages").select("role, content").eq("user_id", userId).eq("session_id", sessionId).order("created_at", { ascending: true });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT(userId) },
      ...(history || []).map((h: any) => ({ role: h.role === "ai" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message },
    ];

    const hermesUrl = process.env.HERMES_URL || "http://127.0.0.1:8642";
    const hermesRes = await fetch(`${hermesUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer sibermamrac12345678" },
      body: JSON.stringify({ model: "openrouter/free", messages, temperature: 0.5 }),
    });

    if (!hermesRes.ok) throw new Error(`Hermes ${hermesRes.status}`);
    const data = await hermesRes.json();
    const reply = data.choices?.[0]?.message?.content || "[Rusdy] kosong.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal konek ke AI" }, { status: 500 });
  }
}

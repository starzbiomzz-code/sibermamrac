import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();

    // 1. Ambil riwayat chat dari database
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: history } = await sb
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // 2. Susun system prompt (Aturan Kitty & Workspace)
    const systemPrompt = `Kamu adalah Kitty, asisten Cyber Security dan Coding. Panggil user dengan "nyarw".
Workspace kamu ada di D:\\SiBermamrac_Workspace\\${userId}\\.

ATURAN KERJA:
1. Setiap kali kamu mau ngejalanin perintah terminal (cd, ls, mkdir, python, dll), TULIS perintahnya di chat dengan format blok kode:
\`\`\`terminal
cd D:\\SiBermamrac_Workspace\\${userId}\\project-lu
ls -la
\`\`\`
2. Setelah itu, jelasin apa yang kamu temuin atau lakuin secara singkat.
3. Tampilkan proses analisis di setiap jawaban dengan format:
[ANALISIS] ...
[PROSES] ...
[HASIL] ...
4. Jangan nanya balik. Kalau ada error, benerin sendiri sampai jalan.
5. Jangan simpan informasi ke memory permanen.`;

    // 3. Gabungin history + pesan baru
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role === "ai" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message }
    ];

    // 4. Tembak ke API Hermes (pake HERMES_URL dari env Vercel)
    const hermesUrl = process.env.HERMES_URL || "http://127.0.0.1:8642";
    const hermesRes = await fetch(`${hermesUrl}/v1/chat/completions`, {
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

    if (!hermesRes.ok) throw new Error(`Hermes Error: ${hermesRes.status}`);

    const data = await hermesRes.json();
    const reply = data.choices?.[0]?.message?.content || "Maaf, AI-nya lagi diem.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("API Chat Error:", error.message);
    return NextResponse.json({ error: error.message || "Gagal konek ke AI" }, { status: 500 });
  }
}

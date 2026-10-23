import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;

    if (!token) return NextResponse.json({ ok: false });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // --- FUNGSI NAMPILIN MENU UTAMA ---
    async function tampilkanDaftar(chatId: string) {
      const { data: pending } = await sb
        .from("deposits")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!pending || pending.length === 0) {
        return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "✅ Tidak ada antrean deposit." }),
        });
      }

      // Bikin list teks (1. email, 2. email...)
      let listTeks = "📋 *DAFTAR ANTREAN BELUM DI-ACC:*\n\n";
      const keyboardAngka: any[] = [];
      let rowAngka: any[] = [];

      pending.slice(0, 30).forEach((d, i) => {
        const nomor = i + 1;
        listTeks += `${nomor}. ${d.email} - Rp ${d.nominal}\n`;
        
        // Bikin tombol angka (maksimal 5 per baris biar rapi)
        rowAngka.push({ text: nomor.toString(), callback_data: `pilih_${d.id}_${nomor}` });
        if (rowAngka.length === 5 || nomor === pending.length) {
          keyboardAngka.push([...rowAngka]);
          rowAngka = [];
        }
      });

      listTeks += "\n👇 Klik tombol angka ✏️ di bawah untuk ACC/Tolak.";

      // Tombol Pensil
      const tombolPensil = [
        [{ text: "✏️ Pilih Antrean (Edit)", callback_data: "buka_angka" }]
      ];

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: listTeks,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: tombolPensil }
        }),
      });
    }

    // --- HANDLE PESAN TEKS ---
    if (body.message) {
      const text = body.message.text;
      
      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "Halo Admin! Ketik /menu untuk cek antrean." }),
        });
      }

      if (text === "/menu") {
        await tampilkanDaftar(chatId);
      }
    }

    // --- HANDLE KLIK TOMBOL ---
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data;
      
      // 1. KLIK TOMBOL PENSIL (BUKA ANGKA)
      if (data === "buka_angka") {
        const { data: pending } = await sb
          .from("deposits")
          .select("id")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (!pending || pending.length === 0) return NextResponse.json({ ok: true });

        const keyboardAngka: any[] = [];
        let rowAngka: any[] = [];
        
        pending.slice(0, 30).forEach((d, i) => {
          const nomor = i + 1;
          rowAngka.push({ text: nomor.toString(), callback_data: `pilih_${d.id}_${nomor}` });
          if (rowAngka.length === 5 || nomor === pending.length) {
            keyboardAngka.push([...rowAngka]);
            rowAngka = [];
          }
        });

        await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: cb.message.message_id,
            reply_markup: { inline_keyboard: keyboardAngka }
          }),
        });

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Silakan pilih nomor antrean." }),
        });
      }

      // 2. KLIK ANGKA ANTREAN (MUNCULIN ACC/TOLAK)
      if (data.startsWith("pilih_")) {
        const parts = data.split("_");
        const id = parts[1];
        const nomor = parts[2];

        await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: cb.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `✅ ACC Antrean #${nomor}`, callback_data: `acc_${id}` },
                  { text: `❌ Tolak Antrean #${nomor}`, callback_data: `rej_${id}` }
                ],
                [{ text: "⬅️ Kembali ke Daftar Angka", callback_data: "buka_angka" }]
              ]
            }
          }),
        });

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: `Pilih aksi untuk antrean #${nomor}` }),
        });
      }

      // 3. EKSEKUSI ACC
      if (data.startsWith("acc_")) {
        const id = data.replace("acc_", "");
        const { data: d } = await sb.from("deposits").select("*").eq("id", id).single();

        if (d) {
          await sb.from("deposits").update({ status: "approved" }).eq("id", id);
          const { data: profile } = await sb.from("profiles").select("saldo").eq("id", d.user_id).single();
          if (profile) {
            await sb.from("profiles").update({ saldo: profile.saldo + d.nominal }).eq("id", d.user_id);
          }

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: cb.id, text: `✅ Berhasil di-ACC!` }),
          });

          // Ganti pesan jadi sukses
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: cb.message.message_id,
              text: `✅ Antrean ${d.email} berhasil di-ACC! Saldo ditambahkan Rp ${d.nominal.toLocaleString()}.`,
              reply_markup: { inline_keyboard: [[{ text: "📋 Kembali ke Daftar", callback_data: "menu_ulang" }]] }
            }),
          });
        }
      }

      // 4. EKSEKUSI TOLAK
      if (data.startsWith("rej_")) {
        const id = data.replace("rej_", "");
        const { data: d } = await sb.from("deposits").select("*").eq("id", id).single();
        
        await sb.from("deposits").update({ status: "rejected" }).eq("id", id);

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: `❌ Deposit ditolak.` }),
        });

        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: cb.message.message_id,
            text: `❌ Antrean ${d?.email} ditolak.`,
            reply_markup: { inline_keyboard: [[{ text: "📋 Kembali ke Daftar", callback_data: "menu_ulang" }]] }
          }),
        });
      }

      // 5. KEMBALI KE MENU UTAMA
      if (data === "menu_ulang") {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id }),
        });
        await tampilkanDaftar(chatId);
      }
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.log("SERVER ERROR FATAL:", err.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
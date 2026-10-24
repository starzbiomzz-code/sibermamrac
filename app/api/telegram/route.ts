import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = body.message?.text;

    if (!token) return NextResponse.json({ ok: true });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Handle /menu buat ACC deposit
    if (body.message && text === "/menu") {
      const { data: pending } = await sb.from("deposits").select("*").eq("status", "pending").order("created_at", { ascending: true });
      if (!pending || pending.length === 0) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: "✅ Tidak ada antrean deposit." }) });
      } else {
        let listTeks = "📋 *DAFTAR ANTREAN BELUM DI-ACC:*\n\n";
        const keyboardAngka: any[] = [];
        let rowAngka: any[] = [];
        pending.slice(0, 30).forEach((d, i) => {
          listTeks += `${i + 1}. ${d.email} - Rp ${d.nominal}\n`;
          rowAngka.push({ text: (i + 1).toString(), callback_data: `pilih_${d.id}_${i + 1}` });
          if (rowAngka.length === 5 || i === pending.length - 1) { keyboardAngka.push([...rowAngka]); rowAngka = []; }
        });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: listTeks, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "✏️ Pilih Antrean (Edit)", callback_data: "buka_angka" }]] } }),
        });
      }
    }

    // Handle klik tombol ACC (Callback Query)
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data;

      if (data === "buka_angka") {
        const { data: pending } = await sb.from("deposits").select("id").eq("status", "pending").order("created_at", { ascending: true });
        if (!pending || pending.length === 0) return NextResponse.json({ ok: true });
        const keyboardAngka: any[] = [];
        let rowAngka: any[] = [];
        pending.slice(0, 30).forEach((d, i) => {
          const nomor = i + 1;
          rowAngka.push({ text: nomor.toString(), callback_data: `pilih_${d.id}_${nomor}` });
          if (rowAngka.length === 5 || nomor === pending.length) { keyboardAngka.push([...rowAngka]); rowAngka = []; }
        });
        await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: keyboardAngka } }) });
      }

      if (data.startsWith("pilih_")) {
        const parts = data.split("_");
        const id = parts[1];
        const nomor = parts[2];
        await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [[{ text: `✅ ACC #${nomor}`, callback_data: `acc_${id}` }, { text: `❌ Tolak #${nomor}`, callback_data: `rej_${id}` }], [{ text: "⬅️ Kembali", callback_data: "buka_angka" }]] } }) });
      }

      if (data.startsWith("acc_")) {
        const id = data.replace("acc_", "");
        const { data: d } = await sb.from("deposits").select("*").eq("id", id).single();
        if (d) {
          await sb.from("deposits").update({ status: "approved" }).eq("id", id);
          const { data: profile } = await sb.from("profiles").select("saldo").eq("id", d.user_id).single();
          if (profile) await sb.from("profiles").update({ saldo: profile.saldo + d.nominal }).eq("id", d.user_id);
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id, text: `✅ Berhasil di-ACC!` }) });
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id, text: `✅ Antrean ${d.email} berhasil di-ACC!` }) });
        }
      }

      if (data.startsWith("rej_")) {
        const id = data.replace("rej_", "");
        await sb.from("deposits").update({ status: "rejected" }).eq("id", id);
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id, text: `❌ Ditolak.` }) });
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id, text: `❌ Antrean ditolak.` }) });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

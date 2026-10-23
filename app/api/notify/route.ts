import { NextRequest, NextResponse } from "next/server";

function sensorEmail(email: string) {
  const [name, domain] = email.split("@");
  return name.slice(0, 3) + "***@" + domain;
}

export async function POST(req: NextRequest) {
  const { email, nominal, total } = await req.json();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const text = `🔔 *DEPOSIT BARU*\nUser: ${sensorEmail(email)}\nNominal: Rp ${nominal.toLocaleString()}\nTotal: Rp ${total.toLocaleString()}\n\nBuka /admin untuk ACC.`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  return NextResponse.json({ ok: true });
}

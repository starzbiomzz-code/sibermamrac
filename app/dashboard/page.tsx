import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKO = [
  { slug: "prompt-ai",  nama: "Toko Prompt AI",      emoji: "🤖" },
  { slug: "bot-wa",     nama: "Toko Bot WhatsApp",   emoji: "💬" },
  { slug: "pytro",      nama: "Toko Pytro",          emoji: "🐍" },
  { slug: "sibermamrac",nama: "Toko Sibermamrac",    emoji: "🛡️" },
  { slug: "apk",        nama: "Toko APK",            emoji: "📱" },
];

async function DashboardContent() {
  await connection();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  
  if (!user) redirect("/login");

  const { data: profile } = await sb.from("profiles").select("saldo").eq("id", user.id).single();
  const saldo = profile?.saldo ?? 0;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-coffee)" }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="paper-card px-4 py-2">
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>Saldo: </span>
            <span className="paper-credit">{saldo.toLocaleString()} Credit 💳</span>
          </div>
          {/* Tombol ke Halaman Status */}
          <Link href="/status" className="paper-card px-4 py-2 text-sm">Riwayat Deposit</Link>
          <Link href="/topup" className="paper-btn">Isi Saldo</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOKO.map((t) => (
          <Link key={t.slug} href={`/toko/${t.slug}`} className="paper-card p-6 block">
            <div className="text-4xl">{t.emoji}</div>
            <div className="font-semibold mt-3" style={{ color: "var(--color-coffee)" }}>{t.nama}</div>
            <div className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Lihat produk →</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Memuat dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

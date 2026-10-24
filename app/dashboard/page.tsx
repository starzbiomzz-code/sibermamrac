import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./client";

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

  // Pake maybeSingle() biar kalo profil belum kebikin, ga langsung crash
  const { data: profile } = await sb.from("profiles").select("saldo, role").eq("id", user.id).maybeSingle();
  const saldo = profile?.saldo ?? 0;
  const role = profile?.role ?? "user";

  const { data: sub } = await sb.from("subscriptions")
    .select("expired_at, agent_type").eq("user_id", user.id).eq("status", "active")
    .gte("expired_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  let sisaWaktu = null;
  if (sub) {
    const diff = new Date(sub.expired_at).getTime() - new Date().getTime();
    sisaWaktu = Math.floor(diff / (1000 * 60));
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <DashboardClient saldo={saldo} user={user} sisaWaktu={sisaWaktu} agent={sub?.agent_type || null} role={role} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
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

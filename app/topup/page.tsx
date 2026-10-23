"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NOMINAL = [1000, 25000, 50000, 75000, 100000, 500000];

export default function TopUp() {
  const [pilih, setPilih] = useState<number | null>(null);
  const [kodeUnik, setKodeUnik] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  const total = pilih && kodeUnik ? pilih + kodeUnik : 0;

  function handlePilih(n: number) {
    setPilih(n);
    setKodeUnik(Math.floor(Math.random() * 999) + 1);
    setErr("");
  }

  async function sudahBayar() {
    if (!pilih || !kodeUnik) return;
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return setErr("Login dulu");

    const { error } = await sb.from("deposits").insert({
      user_id: user.id,
      email: user.email,
      nominal: pilih,
      kode_unik: kodeUnik,
      total_bayar: total,
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, nominal: pilih, total }),
    });

    // Balik ke dashboard
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="paper-card p-8 w-full max-w-md">
        <Link href="/dashboard" className="text-sm underline mb-4 block" style={{ color: "var(--color-muted)" }}>← Kembali</Link>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--color-coffee)" }}>Isi Saldo Credit 💳</h1>

        {!pilih ? (
          <div className="grid grid-cols-2 gap-3">
            {NOMINAL.map((n) => (
              <button key={n} onClick={() => handlePilih(n)} className="paper-card p-3 text-sm font-semibold hover:-translate-y-[1px] transition-all" style={{ color: "var(--color-coffee)" }}>
                Rp {n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-line)" }}>
            <p className="text-sm mb-1" style={{ color: "var(--color-muted)" }}>Total Bayar:</p>
            <p className="text-2xl font-bold mb-4" style={{ color: "var(--color-brick)" }}>
              Rp {total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            </p>
            
            <div className="text-center bg-white p-4 rounded border" style={{ borderColor: "var(--color-line)" }}>
              <p className="text-xs text-gray-500 mb-2">Scan QRIS ini (DANA/OVO/GoPay/Bank)</p>
              <img src="/qris.png" alt="QRIS" className="mx-auto w-64" />
            </div>

            <p className="text-xs mt-4 text-center" style={{ color: "var(--color-muted)" }}>
              *Transfer TEPAT <b>Rp {total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</b> (ada kode unik {kodeUnik}).
            </p>

            {err && <p className="text-sm mt-2 text-red-500">{err}</p>}

            <button onClick={sudahBayar} disabled={loading} className="paper-btn w-full mt-4 bg-green-800 hover:bg-green-900 border-green-900">
              {loading ? "Memproses..." : "Saya Sudah Bayar"}
            </button>
            <button onClick={() => setPilih(null)} className="w-full mt-2 text-sm underline text-gray-500">
              Batalkan Pembayaran
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

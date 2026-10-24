"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HARGA_PER_JAM = { Basic: 5000, Pro: 10000 };

export default function ChatPage() {
  const [saldo, setSaldo] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [proses, setProses] = useState(false);
  const [err, setErr] = useState("");
  const [agent, setAgent] = useState<"Basic" | "Pro">("Basic");
  const [durasi, setDurasi] = useState("1");
  const [satuan, setSatuan] = useState("jam");
  const router = useRouter();

  useEffect(() => {
    async function fetchSaldo() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await sb.from("profiles").select("saldo").eq("id", user.id).single();
      setSaldo(data?.saldo ?? 0);
      setLoading(false);
    }
    fetchSaldo();
  }, [router]);

  async function beliPaket() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    
    // Hitung durasi dalam jam
    let jam = parseInt(durasi) || 1;
    if (satuan === "menit") jam = jam / 60;
    if (satuan === "hari") jam = jam * 24;
    if (satuan === "minggu") jam = jam * 24 * 7;
    if (satuan === "bulan") jam = jam * 24 * 30;
    if (satuan === "tahun") jam = jam * 24 * 365;

    const totalHarga = Math.ceil(jam * HARGA_PER_JAM[agent]);
    if (saldo < totalHarga) return setErr(`Saldo nggak cukup. Butuh ${totalHarga.toLocaleString()} Credit 💳`);

    setProses(true);
    setErr("");

    // Potong saldo
    await sb.from("profiles").update({ saldo: saldo - totalHarga }).eq("id", user!.id);

    // Hitung expired_at
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + (jam * 60));

    // Simpan langganan
    await sb.from("subscriptions").insert({
      user_id: user!.id,
      agent_type: agent,
      expired_at: expiredAt.toISOString(),
      status: "active"
    });

    router.push(`/chat/room?agent=${agent}`);
  }

  if (loading) return <div className="p-10 text-center">Memuat data...</div>;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <Link href="/dashboard" className="text-sm underline mb-4 block" style={{ color: "var(--color-muted)" }}>← Kembali</Link>
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-coffee)" }}>Chat AI</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>Saldo: <b className="paper-credit">{saldo.toLocaleString()} Credit 💳</b></p>

      {err && <p className="text-sm text-red-500 mb-4">{err}</p>}

      <div className="paper-card p-6 max-w-md">
        <h3 className="font-bold mb-4" style={{ color: "var(--color-coffee)" }}>Pilih Agen & Durasi</h3>
        
        <div className="flex gap-2 mb-4">
          <button onClick={() => setAgent("Basic")} className={`flex-1 p-2 rounded border ${agent === "Basic" ? "bg-[#5C4033] text-white" : "bg-white"}`}>Rusdy Agent 1 (Basic)</button>
          <button onClick={() => setAgent("Pro")} className={`flex-1 p-2 rounded border ${agent === "Pro" ? "bg-[#6B8E23] text-white" : "bg-white"}`}>Rusdy Agent 2 (Pro)</button>
        </div>

        <p className="text-sm mb-2">Mau berapa lama?</p>
        <div className="flex gap-2 mb-4">
          <input type="number" value={durasi} onChange={e => setDurasi(e.target.value)} className="paper-input w-20" min="1" />
          <select value={satuan} onChange={e => setSatuan(e.target.value)} className="paper-input flex-1">
            <option value="menit">Menit</option>
            <option value="jam">Jam</option>
            <option value="hari">Hari</option>
            <option value="minggu">Minggu</option>
            <option value="bulan">Bulan</option>
            <option value="tahun">Tahun</option>
          </select>
        </div>

        <p className="text-sm mb-4">Harga: <b>{Math.ceil((parseInt(durasi) || 1) * (satuan === "menit" ? 1/60 : satuan === "hari" ? 24 : satuan === "minggu" ? 168 : satuan === "bulan" ? 720 : satuan === "tahun" ? 8760 : 1) * HARGA_PER_JAM[agent]).toLocaleString()} Credit 💳</b></p>
        
        <button onClick={beliPaket} disabled={proses} className="paper-btn w-full">
          {proses ? "Memproses..." : "Belanja & Masuk Chat"}
        </button>
      </div>
    </main>
  );
}

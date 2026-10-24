"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ChatModal({ isOpen, onClose, saldo, user }: { isOpen: boolean, onClose: () => void, saldo: number, user: any }) {
  const [agent, setAgent] = useState("Basic 1");
  const [durasi, setDurasi] = useState(1);
  const [satuan, setSatuan] = useState("jam");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const HARGA_PER_JAM = {
    "Basic 1": 5000, "Basic 2": 8000, "Basic 3": 12000, "Basic 4": 15000,
    "Pro 1": 10000, "Pro 2": 15000, "Pro 3": 20000, "Pro 4": 25000,
  };
  
  let durasiJam = durasi;
  if (satuan === "menit") durasiJam = durasi / 60;
  if (satuan === "hari") durasiJam = durasi * 24;
  if (satuan === "minggu") durasiJam = durasi * 24 * 7;
  if (satuan === "bulan") durasiJam = durasi * 24 * 30;

  const total = Math.ceil(durasiJam * HARGA_PER_JAM[agent as keyof typeof HARGA_PER_JAM]);

  async function beli() {
    if (saldo < total) return setErr("Saldo Credit 💳 nggak cukup.");
    setLoading(true); setErr("");
    
    const sb = createClient();
    await sb.from("profiles").update({ saldo: saldo - total }).eq("id", user.id);

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + (durasiJam * 60));

    await sb.from("subscriptions").insert({
      user_id: user.id, agent_type: agent, expired_at: expiredAt.toISOString(), status: "active"
    });

    onClose();
    router.push("/chat/room");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      {/* Kita pake max-h-[90vh] & overflow-y-auto biar bisa di-scroll */}
      <div className="paper-card p-6 w-full max-w-md relative bg-white max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-4 text-xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-coffee)" }}>Pilih Agen AI</h2>
        
        {err && <p className="text-sm text-red-500 mb-3">{err}</p>}

        <div className="mb-4">
          <p className="text-sm mb-2 font-semibold">Basic (Hemat)</p>
          <div className="grid grid-cols-4 gap-2">
            {["Basic 1", "Basic 2", "Basic 3", "Basic 4"].map(a => (
              <button key={a} onClick={() => setAgent(a)} className={`p-2 border rounded text-xs ${agent === a ? "bg-[#5C4033] text-white" : "bg-white text-black"}`}>{a}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm mb-2 font-semibold">Pro (Pinter)</p>
          <div className="grid grid-cols-4 gap-2">
            {["Pro 1", "Pro 2", "Pro 3", "Pro 4"].map(a => (
              <button key={a} onClick={() => setAgent(a)} className={`p-2 border rounded text-xs ${agent === a ? "bg-[#6B8E23] text-white" : "bg-white text-black"}`}>{a}</button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <p className="text-sm mb-2 font-semibold">Durasi</p>
            <input type="number" min="1" value={durasi} onChange={e => setDurasi(parseInt(e.target.value) || 1)} className="paper-input w-full" />
          </div>
          <div className="flex-1">
            <p className="text-sm mb-2 font-semibold">Satuan</p>
            <select value={satuan} onChange={e => setSatuan(e.target.value)} className="paper-input w-full">
              <option value="menit">Menit</option>
              <option value="jam">Jam</option>
              <option value="hari">Hari</option>
              <option value="minggu">Minggu</option>
              <option value="bulan">Bulan</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-3 mb-4 flex justify-between font-bold" style={{ borderColor: "var(--color-line)" }}>
          <span>Total:</span>
          <span style={{ color: "var(--color-brick)" }}>{total.toLocaleString()} Credit 💳</span>
        </div>

        <button onClick={beli} disabled={loading} className="paper-btn w-full">
          {loading ? "Memproses..." : "Bayar & Masuk Chat"}
        </button>
      </div>
    </div>
  );
}

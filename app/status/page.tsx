"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function StatusPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      
      const { data } = await sb
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (data) setDeposits(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center">Memuat data...</div>;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm underline mb-6 block" style={{ color: "var(--color-muted)" }}>← Kembali ke Dashboard</Link>
        <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-coffee)" }}>Riwayat & Status Deposit</h1>
        
        <div className="grid gap-4">
          {deposits.map((d) => (
            <div key={d.id} className="paper-card p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg" style={{ color: "var(--color-coffee)" }}>Rp {d.nominal.toLocaleString()}</p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>Kode Unik: {d.kode_unik} | Total: Rp {d.total_bayar.toLocaleString()}</p>
              </div>
              <div>
                {d.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-semibold">Pending</span>}
                {d.status === 'approved' && <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">Sukses</span>}
                {d.status === 'rejected' && <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">Ditolak</span>}
              </div>
            </div>
          ))}
          {deposits.length === 0 && <p className="text-gray-500">Belum ada riwayat deposit.</p>}
        </div>
      </div>
    </main>
  );
}

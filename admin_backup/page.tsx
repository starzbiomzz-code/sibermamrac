"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDeposits() {
    const res = await fetch("/api/admin/list");
    if (res.ok) {
      const data = await res.json();
      setDeposits(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDeposits();
  }, []);

  async function handleAction(id: string, userId: string, nominal: number, action: 'approve' | 'reject') {
    await fetch(`/api/admin/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId, nominal }),
    });
    fetchDeposits();
  }

  if (loading) return <div className="p-10 text-center">Memuat data...</div>;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-coffee)" }}>Admin — Payment Users</h1>
      <div className="grid gap-4 max-w-2xl">
        {deposits.map((d) => (
          <div key={d.id} className="paper-card p-4">
            <p className="font-bold">{d.email}</p>
            <p className="text-sm">Kode Unik: {d.kode_unik} | Total: <b>Rp {d.total_bayar.toLocaleString()}</b></p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleAction(d.id, d.user_id, d.nominal, 'approve')} className="bg-green-600 text-white px-4 py-1 rounded text-sm">ACC / Terima</button>
              <button onClick={() => handleAction(d.id, d.user_id, d.nominal, 'reject')} className="bg-red-600 text-white px-4 py-1 rounded text-sm">Tolak</button>
            </div>
          </div>
        ))}
        {deposits.length === 0 && <p>Nggak ada antrean deposit.</p>}
      </div>
    </main>
  );
}

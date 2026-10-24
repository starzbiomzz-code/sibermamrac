"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminClient() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    const res = await fetch("/api/admin/list");
    if (res.status === 403) { setErr("Akses ditolak. Halaman ini khusus admin."); setLoading(false); return; }
    if (res.ok) setDeposits(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function act(id: string, userId: string, nominal: number, kind: "approve" | "reject") {
    await fetch(`/api/admin/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId, nominal }),
    });
    load();
  }

  if (loading) return <div className="p-10 text-center">Memuat...</div>;
  if (err) return <div className="p-10 text-center text-red-600 font-bold">{err}</div>;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm underline mb-6 block" style={{ color: "var(--color-muted)" }}>← Dashboard</Link>
        <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-coffee)" }}>Admin — Payment Users</h1>
        <div className="grid gap-4">
          {deposits.map((d) => (
            <div key={d.id} className="paper-card p-4">
              <p className="font-bold">{d.email}</p>
              <p className="text-sm">Kode Unik: {d.kode_unik} | Total: <b>Rp {d.total_bayar.toLocaleString()}</b></p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => act(d.id, d.user_id, d.nominal, "approve")} className="bg-green-600 text-white px-4 py-1 rounded text-sm">ACC</button>
                <button onClick={() => act(d.id, d.user_id, d.nominal, "reject")} className="bg-red-600 text-white px-4 py-1 rounded text-sm">Tolak</button>
              </div>
            </div>
          ))}
          {deposits.length === 0 && <p>Tidak ada antrean.</p>}
        </div>
      </div>
    </main>
  );
}

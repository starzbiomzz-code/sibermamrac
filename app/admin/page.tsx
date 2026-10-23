import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function AdminDashboard() {
  await connection(); // <-- PAKSA DINAMIS

  const { data: deposits } = await sb
    .from("deposits")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-coffee)" }}>Admin — Payment Users</h1>
      <div className="grid gap-4 max-w-2xl">
        {deposits?.map((d) => (
          <div key={d.id} className="paper-card p-4">
            <p className="font-bold">{d.email}</p>
            <p className="text-sm">Kode Unik: {d.kode_unik} | Total: <b>Rp {d.total_bayar.toLocaleString()}</b></p>
            <div className="flex gap-2 mt-3">
              <form action="/api/admin/approve" method="POST">
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="user_id" value={d.user_id} />
                <input type="hidden" name="nominal" value={d.nominal} />
                <button className="bg-green-600 text-white px-4 py-1 rounded text-sm">ACC / Terima</button>
              </form>
              <form action="/api/admin/reject" method="POST">
                <input type="hidden" name="id" value={d.id} />
                <button className="bg-red-600 text-white px-4 py-1 rounded text-sm">Tolak</button>
              </form>
            </div>
          </div>
        ))}
        {!deposits?.length && <p>Nggak ada antrean deposit.</p>}
      </div>
    </main>
  );
}

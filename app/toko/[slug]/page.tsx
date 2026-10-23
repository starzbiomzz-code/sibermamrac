import Link from "next/link";

const PRODUK_DUMMY = [
  { nama: "Paket Premium", harga: 50000, desc: "Akses penuh semua fitur." },
  { nama: "Paket Basic", harga: 25000, desc: "Akses fitur dasar." },
  { nama: "Script/Tools", harga: 10000, desc: "Kumpulan file yang siap dipakai." },
];

export default function TokoPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  
  const judul = slug === 'apk' ? 'Toko APK Bug + RAT' 
              : slug === 'bot-wa' ? 'Toko Bot WhatsApp' 
              : `Toko ${slug.charAt(0).toUpperCase() + slug.slice(1).replace("-", " ")}`;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm underline mb-6 block" style={{ color: "var(--color-muted)" }}>← Kembali ke Dashboard</Link>
        <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-coffee)" }}>{judul}</h1>

        <div className="grid gap-4">
          {PRODUK_DUMMY.map((p, i) => (
            <div key={i} className="paper-card p-6 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg" style={{ color: "var(--color-coffee)" }}>{p.nama}</p>
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>{p.desc}</p>
              </div>
              <div className="text-right">
                <p className="font-bold mb-2" style={{ color: "var(--color-brick)" }}>{p.harga.toLocaleString()} Credit 💳</p>
                <button className="paper-btn text-sm">Beli Sekarang</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
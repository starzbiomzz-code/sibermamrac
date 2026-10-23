"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [sukses, setSukses] = useState(false); // State buat notifikasi sukses
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const sb = createClient();
    
    // Daftarin user
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    
    if (error) {
      return setErr(error.message);
    }

    // Cek apakah Supabase butuh konfirmasi email
    // (kalau session null, berarti user harus cek email dulu)
    if (data?.user && !data?.session) {
      setSukses(true);
    } else {
      // Kalau confirm email dimatiin, langsung masuk dashboard
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="paper-card p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-coffee)" }}>Daftar</h1>
        
        {/* NOTIFIKASI SUKSES */}
        {sukses ? (
          <div className="mt-4 p-4 border border-green-600 rounded bg-green-50 text-green-800 text-sm">
            <p className="font-bold mb-1">Akun berhasil dibuat! 🎉</p>
            <p>Kami sudah ngirim link konfirmasi ke <b>{email}</b>. Cek inbox (atau folder spam) lu, klik link-nya, terus balik ke sini buat login.</p>
            <Link href="/login" className="inline-block mt-3 underline font-semibold text-green-900">
              Ke Halaman Login →
            </Link>
          </div>
        ) : (
          <>
            {err && <p className="text-sm mt-3" style={{ color: "var(--color-brick)" }}>{err}</p>}
            <input className="paper-input mt-4" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="paper-input mt-3" type="password" placeholder="Password (min 6)" value={pass} onChange={e => setPass(e.target.value)} required />
            <button className="paper-btn w-full mt-4" type="submit">Daftar</button>
            <p className="text-sm mt-4 text-center" style={{ color: "var(--color-muted)" }}>
              Sudah punya akun? <Link href="/login" className="underline">Login</Link>
            </p>
          </>
        )}
      </form>
    </main>
  );
}

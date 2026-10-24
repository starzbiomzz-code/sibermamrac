"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const sb = createClient();
    
    const { error } = await sb.auth.signInWithPassword({ 
      email: email.trim(), 
      password: pass 
    });
    
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    // Paksa pindah halaman pake hard reload
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="paper-card p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-coffee)" }}>Login</h1>
        {err && <p className="text-sm mt-3 text-red-500">{err}</p>}
        <input className="paper-input mt-4" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="paper-input mt-3" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
        <button className="paper-btn w-full mt-4" type="submit" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
        <p className="text-sm mt-4 text-center" style={{ color: "var(--color-muted)" }}>
          Belum punya akun? <Link href="/register" className="underline">Daftar</Link>
        </p>
      </form>
    </main>
  );
}

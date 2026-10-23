"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) return setErr(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="paper-card p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-coffee)" }}>Login</h1>
        {err && <p className="text-sm mt-3" style={{ color: "var(--color-brick)" }}>{err}</p>}
        <input className="paper-input mt-4" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="paper-input mt-3" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
        <button className="paper-btn w-full mt-4" type="submit">Masuk</button>
        <p className="text-sm mt-4 text-center" style={{ color: "var(--color-muted)" }}>
          Belum punya akun? <Link href="/register" className="underline">Daftar</Link>
        </p>
      </form>
    </main>
  );
}

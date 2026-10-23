import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 md:px-10 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
        <Link href="/" className="text-xl font-bold" style={{ color: "var(--color-coffee)" }}>
          SiBermamrac
        </Link>
        <div className="flex gap-3">
          <Link href="/login" className="paper-card px-4 py-2 text-sm">Login</Link>
          <Link href="/register" className="paper-btn">Sign Up</Link>
        </div>
      </nav>
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "var(--color-coffee)" }}>
          Toko Digital SiBermamrac
        </h1>
        <p className="mt-4 text-lg" style={{ color: "var(--color-muted)" }}>
          Prompt AI, bot WhatsApp, tools Python, materi cybersecurity, dan APK—semua di satu tempat, bayar pakai Credit 💳.
        </p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Link href="/register" className="paper-btn">Mulai Sekarang</Link>
        </div>
      </section>
    </main>
  );
}

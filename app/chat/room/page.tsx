"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: string; content: string; kind?: "chat" | "work" };

function parseReply(text: string): Msg[] {
  const bubbles = text.split(/\|\|\|/).map(s => s.trim()).filter(Boolean);
  return bubbles.map(b => {
    if (/```terminal|\[ANALISIS\]|\[PROSES\]|\[HASIL\]/.test(b)) {
      return { role: "ai", content: b, kind: "work" as const };
    }
    return { role: "ai", content: b, kind: "chat" as const };
  });
}

export default function ChatRoom() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<Msg[]>([]);
  const [workLog, setWorkLog] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [sisaWaktu, setSisaWaktu] = useState("Menghitung...");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const bottomChatRef = useRef<HTMLDivElement>(null);
  const bottomWorkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let t: NodeJS.Timeout;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("expired_at", { ascending: false }).limit(1).maybeSingle();
      if (sub?.expired_at) {
        t = setInterval(() => {
          const diff = new Date(sub.expired_at).getTime() - Date.now();
          if (diff <= 0) { setExpired(true); setSisaWaktu("Habis"); clearInterval(t); }
          else { setExpired(false); setSisaWaktu(`${Math.floor(diff/3600000)%24}j ${Math.floor(diff/60000)%60}m ${Math.floor(diff/1000)%60}s`); }
        }, 1000);
      } else { setExpired(true); setSisaWaktu("Habis"); }

      const { data: sess } = await sb.from("chat_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (sess?.length) { setSessions(sess); setCurrentSessionId(sess[0].id); }
      else {
        const { data: ns } = await sb.from("chat_sessions").insert({ user_id: user.id }).select().single();
        if (ns) { setSessions([ns]); setCurrentSessionId(ns.id); }
      }
    }
    load();
    return () => { if (t) clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!currentSessionId || !userId) return;
    async function loadMsgs() {
      const sb = createClient();
      const { data } = await sb.from("chat_messages").select("role, content").eq("user_id", userId).eq("session_id", currentSessionId).order("created_at", { ascending: true });
      if (!data) return;
      const chats: Msg[] = [], works: Msg[] = [];
      for (const m of data) {
        if (m.role === "ai") {
          for (const b of parseReply(m.content)) {
            if (b.kind === "work") works.push(b); else chats.push(b);
          }
        } else chats.push({ role: m.role, content: m.content, kind: "chat" });
      }
      setChat(chats); setWorkLog(works);
    }
    loadMsgs();
  }, [currentSessionId, userId]);

  useEffect(() => { bottomChatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, status]);
  useEffect(() => { bottomWorkRef.current?.scrollIntoView({ behavior: "smooth" }); }, [workLog]);

  async function sesiBaru() {
    const sb = createClient();
    const { data } = await sb.from("chat_sessions").insert({ user_id: userId }).select().single();
    if (data) { setSessions([data, ...sessions]); setCurrentSessionId(data.id); setChat([]); setWorkLog([]); }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim() || !userId || expired || !currentSessionId) return;

    const userMsg = msg;
    setMsg("");
    setChat(p => [...p, { role: "user", content: userMsg, kind: "chat" }]);
    setStatus("mengerjakan...");

    const sb = createClient();
    await sb.from("chat_messages").insert({ user_id: userId, session_id: currentSessionId, role: "user", content: userMsg });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, userId, sessionId: currentSessionId }),
      });
      const data = await res.json();
      setStatus("menyusun...");

      const parsed = parseReply(data.reply || "");
      for (const b of parsed) {
        if (b.kind === "work") {
          await new Promise(r => setTimeout(r, 300));
          setWorkLog(p => [...p, b]);
        } else {
          setChat(p => [...p, b]);
          await new Promise(r => setTimeout(r, 400));
        }
      }
      setStatus(null);
      await sb.from("chat_messages").insert({ user_id: userId, session_id: currentSessionId, role: "ai", content: data.reply || "" });
    } catch {
      setStatus(null);
      setChat(p => [...p, { role: "ai", content: "Error konek AI 😹", kind: "chat" }]);
    }
  }

  function renderContent(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((p, i) => {
      if (p.startsWith("```")) {
        const lines = p.split("\n");
        const code = lines.slice(1, -1).join("\n");
        return (
          <pre key={i} className="bg-[#1C1C1C] text-[#00ff41] p-3 rounded text-[11px] overflow-x-auto font-mono my-2 whitespace-pre-wrap border border-[#3E2B22]">
            {code}
          </pre>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{p}</span>;
    });
  }

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-coffee)" }}>Rusdy 💻</h1>
        <div className="flex gap-2 items-center">
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>{expired ? '🔴 Offline' : `⏳ ${sisaWaktu}`}</div>
          <Link href="/dashboard" className="paper-btn text-sm">Perpanjang</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1" style={{ minHeight: "60vh" }}>
        <div className="paper-card p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>💬 Obrolan</p>
            <button onClick={sesiBaru} className="text-xs underline" style={{ color: "var(--color-coffee)" }}>+ Sesi Baru</button>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3" style={{ maxHeight: "55vh" }}>
            {chat.map((c, i) => (
              <div key={i} className={`p-2 rounded-lg max-w-[90%] text-sm ${c.role === "user" ? "bg-[#5C4033] text-white self-end" : "bg-[#F5F0E8] self-start border border-[#D4C5B0]"}`}>
                {renderContent(c.content)}
              </div>
            ))}
            {status && <div className="text-xs italic" style={{ color: "var(--color-muted)" }}>&gt; {status}</div>}
            <div ref={bottomChatRef} />
          </div>
          <form onSubmit={kirim} className="flex gap-2">
            <input className="paper-input flex-1" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ngobrol atau kasih tugas... 🔥" disabled={!!status || expired || !userId} />
            <button className="paper-btn" type="submit" disabled={!!status || expired || !userId}>Kirim</button>
          </form>
        </div>

        <div className="paper-card p-4 flex flex-col" style={{ background: "#0d0d0d" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-[#00ff41]">💻 Rusdy Workspace</p>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3" style={{ maxHeight: "60vh" }}>
            {workLog.length === 0 && <p className="text-xs text-gray-500 italic">Belum ada tugas 😴</p>}
            {workLog.map((w, i) => (
              <div key={i} className="text-xs text-[#00ff41] font-mono border-l-2 border-[#00ff41]/50 pl-3">
                {renderContent(w.content)}
              </div>
            ))}
            <div ref={bottomWorkRef} />
          </div>
        </div>
      </div>
    </main>
  );
}

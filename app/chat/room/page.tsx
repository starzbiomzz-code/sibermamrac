"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ChatRoom() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<{role: string, content: string}[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [sisaWaktu, setSisaWaktu] = useState("Menghitung...");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: sub } = await sb.from("subscriptions")
        .select("*").eq("user_id", user.id).eq("status", "active")
        .order("expired_at", { ascending: false }).limit(1).maybeSingle();
      
      if (sub && sub.expired_at) {
        checkInterval = setInterval(() => {
          const diff = new Date(sub.expired_at).getTime() - new Date().getTime();
          if (diff <= 0) { setExpired(true); setSisaWaktu("Habis"); clearInterval(checkInterval); }
          else {
            setExpired(false);
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setSisaWaktu(`${h}j ${m}m ${s}s`);
          }
        }, 1000);
      } else { setExpired(true); setSisaWaktu("Habis"); }

      const { data: sessData } = await sb.from("chat_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (sessData && sessData.length > 0) { setSessions(sessData); setCurrentSessionId(sessData[0].id); }
      else {
        const { data: newSess } = await sb.from("chat_sessions").insert({ user_id: user.id }).select().single();
        if (newSess) { setSessions([newSess]); setCurrentSessionId(newSess.id); }
      }
    }
    load();
    return () => { if (checkInterval) clearInterval(checkInterval); };
  }, []);

  useEffect(() => {
    if (!currentSessionId || !userId) return;
    async function loadMsgs() {
      const sb = createClient();
      const { data } = await sb.from("chat_messages").select("role, content").eq("user_id", userId).eq("session_id", currentSessionId).order("created_at", { ascending: true });
      if (data) setChat(data);
    }
    loadMsgs();
  }, [currentSessionId, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, typingText, status]);

  async function sesiBaru() {
    const sb = createClient();
    const { data } = await sb.from("chat_sessions").insert({ user_id: userId }).select().single();
    if (data) { setSessions([data, ...sessions]); setCurrentSessionId(data.id); setChat([]); }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim() || !userId || expired || !currentSessionId) return;

    const userMsg = msg;
    setMsg("");
    setChat(prev => [...prev, { role: "user", content: userMsg }]);
    setStatus("mengerjakan tugas...");

    const sb = createClient();
    await sb.from("chat_messages").insert({ user_id: userId, session_id: currentSessionId, role: "user", content: userMsg });

    const currentSess = sessions.find(s => s.id === currentSessionId);
    if (currentSess && currentSess.title === "Percakapan Baru") {
      await sb.from("chat_sessions").update({ title: userMsg.slice(0, 30) + "..." }).eq("id", currentSessionId);
      setSessions(sessions.map(s => s.id === currentSessionId ? {...s, title: userMsg.slice(0, 30)} : s));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, userId, sessionId: currentSessionId }),
      });
      const data = await res.json();

      setStatus("menyusun jawaban...");
      const fullText = data.reply;
      let currentText = "";

      for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];
        setTypingText(currentText);
        await new Promise(r => setTimeout(r, 8));
      }

      setStatus(null);
      setChat(prev => [...prev, { role: "ai", content: fullText }]);
      setTypingText("");
      await sb.from("chat_messages").insert({ user_id: userId, session_id: currentSessionId, role: "ai", content: fullText });
    } catch (err) {
      setStatus(null);
      setChat(prev => [...prev, { role: "ai", content: "Error: Gagal konek ke AI." }]);
    }
  }

  function renderContent(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const code = lines.slice(1, -1).join("\n");
        return (
          <pre key={i} className="bg-black text-green-400 p-3 rounded text-xs overflow-x-auto font-mono my-2 border border-gray-700 whitespace-pre-wrap">
            {code}
          </pre>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  }

  return (
    <main className="min-h-screen p-6 md:p-10 flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-64 paper-card p-4 flex flex-col h-fit max-h-[80vh] bg-[#FFFDF9]">
        <button onClick={sesiBaru} className="paper-btn w-full mb-4 text-sm py-2">+ Percakapan Baru</button>
        <div className="overflow-y-auto flex flex-col gap-2">
          <p className="text-xs font-bold mb-1" style={{ color: "var(--color-muted)" }}>Riwayat Chat</p>
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setCurrentSessionId(s.id)}
              className={`text-left p-2 rounded text-sm truncate ${currentSessionId === s.id ? "bg-[#5C4033] text-white" : "bg-gray-100 hover:bg-gray-200 text-black"}`}>
              {s.title || "Percakapan Baru"}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-coffee)" }}>Ruang Chat AI</h1>
          <div className="flex gap-2 items-center">
            <div className={`px-3 py-1 rounded text-sm font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
              {expired ? '🔴 AI Dimatikan' : `⏳ Sisa: ${sisaWaktu}`}
            </div>
            <Link href="/dashboard" className="paper-btn text-sm">Perpanjang</Link>
          </div>
        </div>
        
        {expired && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-3 text-sm"><b>Sesi Berakhir.</b> AI dimatikan otomatis. Silakan Perpanjang.</div>}

        <div className="flex-1 paper-card p-4 overflow-y-auto mb-4 flex flex-col gap-3" style={{ minHeight: "300px", maxHeight: "60vh" }}>
          {chat.map((c, i) => (
            <div key={i} className={`p-3 rounded max-w-[85%] text-sm ${c.role === "user" ? "bg-[#5C4033] text-white self-end" : "bg-[#F5F0E8] self-start border border-gray-300"}`}>
              {renderContent(c.content)}
            </div>
          ))}

          {status && (
            <div className="p-2 text-xs self-start border-l-2 border-[#6B8E23] bg-[#6B8E23]/10 animate-pulse text-[#5a7a1d] font-semibold">
              &gt; {status}
            </div>
          )}

          {typingText && (
            <div className="p-3 rounded max-w-[85%] self-start border border-gray-300 bg-[#F5F0E8] text-sm">
              {renderContent(typingText)}
              <span className="animate-pulse">_</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={kirim} className="flex gap-2">
          <input className="paper-input flex-1" value={msg} onChange={e => setMsg(e.target.value)} placeholder={expired ? "AI sudah dimatikan..." : "Tanya apa aja..."} disabled={!!status || expired || !userId} />
          <button className="paper-btn" type="submit" disabled={!!status || expired || !userId}>Kirim</button>
        </form>
      </div>
    </main>
  );
}

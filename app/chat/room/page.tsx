"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ChatRoom() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<{role: string, content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [sisaWaktu, setSisaWaktu] = useState("Menghitung...");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
          if (diff <= 0) {
            setExpired(true);
            setSisaWaktu("00:00:00");
            clearInterval(checkInterval);
          } else {
            setExpired(false);
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setSisaWaktu(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          }
        }, 1000);
      } else {
        setExpired(true);
        setSisaWaktu("00:00:00");
      }

      const { data: sessData } = await sb.from("chat_sessions")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      
      if (sessData && sessData.length > 0) {
        setSessions(sessData);
        setCurrentSessionId(sessData[0].id);
      } else {
        const { data: newSess } = await sb.from("chat_sessions").insert({ user_id: user.id }).select().single();
        if (newSess) {
          setSessions([newSess]);
          setCurrentSessionId(newSess.id);
        }
      }
    }
    load();
    return () => { if (checkInterval) clearInterval(checkInterval); };
  }, []);

  useEffect(() => {
    if (!currentSessionId || !userId) return;
    async function loadMsgs() {
      const sb = createClient();
      const { data } = await sb.from("chat_messages").select("role, content")
        .eq("user_id", userId).eq("session_id", currentSessionId).order("created_at", { ascending: true });
      if (data) setChat(data);
    }
    loadMsgs();
  }, [currentSessionId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function sesiBaru() {
    const sb = createClient();
    const { data } = await sb.from("chat_sessions").insert({ user_id: userId }).select().single();
    if (data) {
      setSessions([data, ...sessions]);
      setCurrentSessionId(data.id);
      setChat([]);
    }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim() || !userId || expired || !currentSessionId) return;
    
    const userMsg = msg;
    setMsg("");
    setChat(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    const sb = createClient();
    
    await sb.from("chat_messages").insert({ 
      user_id: userId, session_id: currentSessionId, role: "user", content: userMsg 
    });

    const currentSess = sessions.find(s => s.id === currentSessionId);
    if (currentSess && currentSess.title === "Percakapan Baru") {
      await sb.from("chat_sessions").update({ title: userMsg.slice(0, 30) + "..." }).eq("id", currentSessionId);
      setSessions(sessions.map(s => s.id === currentSessionId ? {...s, title: userMsg.slice(0, 30)} : s));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, userId }),
      });
      const data = await res.json();
      setChat(prev => [...prev, { role: "ai", content: data.reply }]);
      await sb.from("chat_messages").insert({ 
        user_id: userId, session_id: currentSessionId, role: "ai", content: data.reply 
      });
    } catch (err) {
      setChat(prev => [...prev, { role: "ai", content: "SYS.ERR: Connection failed." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col md:flex-row gap-6 bg-[#050508] text-[#00ffcc] font-mono selection:bg-[#ff00ff] selection:text-white overflow-hidden relative">
      
      {/* EFEK SCANLINE DI LAYAR */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-30"></div>

      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-[#0a0a0f] border-r-2 border-[#ff00ff] shadow-[5px_0_20px_rgba(255,0,255,0.2)] p-4 flex flex-col h-fit md:h-[85vh] relative z-10">
        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tighter uppercase text-white drop-shadow-[2px_2px_0_#ff00ff]">SYS.LOG</h2>
          <p className="text-[10px] text-[#ff00ff] tracking-widest mt-1">&gt; MEMORY_FRAGMENTS</p>
        </div>
        <button onClick={sesiBaru} className="w-full mb-4 py-2 bg-[#00ffcc] text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-[#ff00ff] hover:text-white transition-all skew-x-[-10deg]">
          + New Connection
        </button>
        <div className="overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar">
          {sessions.map((s) => (
            <button 
              key={s.id} 
              onClick={() => setCurrentSessionId(s.id)}
              className={`text-left p-2 text-xs truncate border-l-2 transition-all duration-200 ${currentSessionId === s.id ? "border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc] font-bold" : "border-gray-700 text-gray-500 hover:border-[#ff00ff] hover:text-[#ff00ff]"}`}
            >
              &gt; {s.title || "UNNAMED.SYS"}
            </button>
          ))}
        </div>
      </aside>

      {/* RUANG CHAT UTAMA */}
      <div className="flex-1 flex flex-col relative z-10 border border-gray-800 bg-[#08080c]/90 shadow-[0_0_30px_rgba(0,255,204,0.1)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#0a0a0f]">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.1em] text-white glitch-text" data-text="SIBERMAMRAC.AI">SIBERMAMRAC.AI</h1>
            <p className="text-[10px] text-gray-500 tracking-widest mt-1">TERMINAL_SECURE // V.2.0</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className={`px-4 py-1 border-l-2 text-sm font-bold tracking-widest ${expired ? 'border-red-500 text-red-500 shadow-[0_0_15px_red] animate-pulse' : 'border-[#00ffcc] text-[#00ffcc]'}`}>
              {expired ? '[ CONNECTION_LOST ]' : `[ T-MINUS: ${sisaWaktu} ]`}
            </div>
            <Link href="/dashboard" className="text-black bg-white hover:bg-[#ff00ff] hover:text-white px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors skew-x-[-10deg]">
              BACK
            </Link>
          </div>
        </div>
        
        {expired && (
          <div className="bg-red-950/50 border-b border-red-500 text-red-500 p-2 text-xs text-center tracking-[0.3em] font-bold">
            FATAL_ERROR: SESSION EXPIRED
          </div>
        )}

        {/* AREA PESAN */}
        <div className="flex-1 p-6 overflow-y-auto mb-2 flex flex-col gap-6" style={{ minHeight: "300px", maxHeight: "60vh" }}>
          {chat.map((c, i) => (
            <div key={i} className={`relative p-4 max-w-[80%] text-sm backdrop-blur-sm ${c.role === "user" ? "self-end bg-[#ff00ff]/5 border-r-2 border-[#ff00ff] text-white" : "self-start bg-[#00ffcc]/5 border-l-2 border-[#00ffcc] text-[#00ffcc]"}`}>
              <span className={`absolute top-0 text-[9px] font-bold tracking-widest -translate-y-1/2 px-1 bg-[#08080c] ${c.role === "user" ? "-right-2 text-[#ff00ff]" : "-left-2 text-[#00ffcc]"}`}>
                {c.role === "user" ? "// USER" : "// AI_CORE"}
              </span>
              {c.content}
            </div>
          ))}
          {loading && <div className="text-xs text-[#ff00ff] animate-pulse tracking-widest">&gt;&gt;&gt; PROCESSING DATA...</div>}
          <div ref={bottomRef} />
        </div>

        {/* INPUT AREA */}
        <form onSubmit={kirim} className="p-4 bg-[#0a0a0f] border-t border-gray-800 flex items-center gap-2">
          <span className="text-[#ff00ff] text-xl font-black">&gt;</span>
          <input 
            className="flex-1 bg-transparent text-[#00ffcc] outline-none placeholder-gray-700 text-sm tracking-wide" 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            placeholder={expired ? "SYSTEM_OFFLINE..." : "TYPE YOUR COMMAND HERE..."} 
            disabled={loading || expired || !userId} 
          />
          <button 
            className="px-6 py-2 bg-[#00ffcc]/10 border border-[#00ffcc] text-[#00ffcc] font-bold uppercase text-xs tracking-widest hover:bg-[#00ffcc] hover:text-black hover:shadow-[0_0_15px_#00ffcc] transition-all disabled:opacity-30 disabled:hover:bg-[#00ffcc]/10 disabled:hover:text-[#00ffcc] disabled:hover:shadow-none skew-x-[-10deg]" 
            type="submit" 
            disabled={loading || expired || !userId}
          >
            EXEC
          </button>
        </form>
      </div>
    </main>
  );
}

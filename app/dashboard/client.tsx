"use client";
import { useState } from "react";
import Link from "next/link";
import ChatModal from "../components/ChatModal";

export default function DashboardClient({ saldo, user, sisaWaktu, agent, role }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-coffee)" }}>Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>{user.email}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="paper-card px-4 py-2">
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>Saldo: </span>
          <span className="paper-credit">{saldo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} Credit 💳</span>
        </div>

        {sisaWaktu ? (
          <div className="flex items-center gap-2">
            <div className="paper-card px-4 py-2 text-sm">
              <span className="text-green-600 font-bold">{agent}</span> | Sisa: {sisaWaktu} menit
            </div>
            <Link href="/chat/room" className="paper-btn">Lanjut Chat</Link>
            <button onClick={() => setIsOpen(true)} className="paper-btn bg-[#6B8E23]">Perpanjang</button>
          </div>
        ) : (
          <button onClick={() => setIsOpen(true)} className="paper-btn bg-[#6B8E23]">🤖 Chat AI</button>
        )}

        <Link href="/status" className="paper-card px-4 py-2 text-sm">Riwayat Deposit</Link>
        <Link href="/topup" className="paper-btn">Isi Saldo</Link>

        {/* TOMBOL ADMIN (CUMA MUNCUL KALO ROLE = ADMIN) */}
        {role === "admin" && (
          <Link href="/admin" className="paper-btn bg-red-800 hover:bg-red-900 border-red-900">Admin</Link>
        )}
      </div>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} saldo={saldo} user={user} />
    </header>
  );
}

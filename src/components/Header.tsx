"use client";

import Link from "next/link";
import { Crown, Shield, Zap, User, LogIn, UserPlus, LogOut, History } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { UserProfile } from "@/lib/auth";

interface HeaderProps {
  rate: number;
  user?: UserProfile | null;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onOpenHistory?: () => void;
  onLogout?: () => void;
}

export default function Header({ 
  rate, 
  user, 
  onOpenAuth, 
  onOpenHistory, 
  onLogout 
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0a0a0f]/90 border-b border-[#1e1e2e]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
            <Crown className="w-6 h-6 text-[#0a0a0f] fill-[#0a0a0f]" />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent tracking-tight">
            KingMC Shop
          </span>
        </Link>

        {/* Center: Live Rate Badge */}
        <div className="hidden md:flex items-center gap-2 bg-[#12121a] border border-emerald-500/40 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-200">
            Tỷ giá hôm nay: <span className="text-emerald-400 font-extrabold text-sm sm:text-base">{rate ? formatVND(rate) : "10,000đ"} / 1M</span>
          </span>
        </div>

        {/* Right: User Auth & Admin */}
        <div className="flex items-center gap-2">
          {user ? (
            /* Logged in state */
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 rounded-xl border border-[#1e1e2e] bg-[#12121a] hover:bg-[#1e1e2e] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-all"
                title="Xem lịch sử đơn hàng của bạn"
              >
                <History size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">Lịch Sử Đơn</span>
              </button>

              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <User size={13} className="text-emerald-400" />
                <span className="max-w-[90px] truncate">{user.username}</span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center justify-center h-8 w-8 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            /* Guest / Not logged in state */
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="flex items-center gap-1.5 rounded-xl border border-[#1e1e2e] bg-[#12121a] hover:bg-[#1e1e2e] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-all"
              >
                <LogIn size={13} className="text-emerald-400" />
                <span>Đăng Nhập</span>
              </button>

              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all"
              >
                <UserPlus size={13} />
                <span>Đăng Ký</span>
              </button>
            </div>
          )}

          {/* Admin link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-xl border border-[#1e1e2e] bg-[#12121a] hover:bg-[#1e1e2e] px-2.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-all"
            title="Dành cho Quản trị viên"
          >
            <Shield size={14} className="text-emerald-500" />
            <span className="hidden lg:inline">Quản Trị</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

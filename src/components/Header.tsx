"use client";

import Link from "next/link";
import { Crown, Zap, History, User, LogIn, LogOut } from "lucide-react";
import { formatVND } from "@/lib/utils";

interface HeaderProps {
  rate: number;
  user?: any;
  onOpenAuth?: () => void;
  onOpenHistory?: () => void;
  onOpenSupport?: () => void;
  onLogout?: () => void;
}

export default function Header({ 
  rate, 
  user, 
  onOpenAuth, 
  onOpenHistory, 
  onOpenSupport,
  onLogout 
}: HeaderProps) {
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.custom_claims?.global_name || 
                      user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      'Thành viên';
  const isDiscord = user?.app_metadata?.provider === 'discord';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0a0a0f]/90 border-b border-[#1e1e2e]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
            <Crown className="w-6 h-6 text-[#0a0a0f] fill-[#0a0a0f]" />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent tracking-tight">
            KingMC Shop
          </span>
        </Link>

        {/* Right side items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Rate Badge (Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-2 bg-[#12121a] border border-emerald-500/40 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span className="text-xs font-semibold text-zinc-300">
              Tỷ giá: <strong className="text-emerald-400">{rate ? formatVND(rate) : "10,000đ"} / 1M</strong>
            </span>
          </div>

          {/* Ticket Hỗ Trợ Button */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 hover:border-[#5865F2]/60 text-xs font-semibold text-[#8fa0ff] transition-all hover:text-white"
            title="Mở Ticket Hỗ Trợ trực tiếp với Admin"
          >
            <MessageSquare size={15} className="text-[#5865F2]" />
            <span className="hidden sm:inline">Hỗ Trợ</span>
          </button>

          {/* Order History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12121a] hover:bg-[#1a1a28] border border-[#1e1e2e] hover:border-emerald-500/40 text-xs font-semibold text-zinc-300 transition-all hover:text-white"
            title="Xem lịch sử mua hàng & ticket"
          >
            <History size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Lịch Sử Mua</span>
          </button>

          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-2">
              <div 
                onClick={onOpenHistory}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#12121a] border border-[#1e1e2e] cursor-pointer hover:border-emerald-500/40 transition-colors"
                title="Tài khoản của bạn"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-6 h-6 rounded-full object-cover border border-emerald-500/50" 
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDiscord ? 'bg-[#5865F2] text-white' : 'bg-emerald-500 text-black'}`}>
                    <User size={12} />
                  </div>
                )}
                <span className="text-xs font-bold text-zinc-200 max-w-[100px] truncate hidden sm:inline">
                  {displayName}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-[#12121a] hover:bg-red-500/10 border border-[#1e1e2e] hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#0a0a0f] font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
            >
              <LogIn size={15} />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

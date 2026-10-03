"use client";

import { Crown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/utils";

interface HeaderProps {
  rate: number;
}

export default function Header({ rate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0a0a0f]/80 border-b border-[#1e1e2e]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Crown className="w-8 h-8 text-emerald-500" />
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            KingMC Shop
          </span>
        </div>

        {/* Center: Rate */}
        <div className="hidden sm:flex items-center gap-2 bg-[#12121a] border border-[#1e1e2e] px-4 py-1.5 rounded-full">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-zinc-300">
            Tỷ giá: <span className="text-emerald-400 font-bold">{rate ? formatVND(rate) : "---"} / 1M</span>
          </span>
        </div>

        {/* Right: Auth Buttons */}
        <div className="flex items-center gap-3">
          <a href="#" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
            Đăng nhập
          </a>
          <a href="#" className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#0a0a0f] bg-emerald-500 hover:bg-emerald-400 rounded-md transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
            Đăng ký
          </a>
        </div>
      </div>
      
      {/* Mobile Rate */}
      <div className="sm:hidden flex items-center justify-center py-2 bg-[#12121a] border-t border-[#1e1e2e]">
        <TrendingUp className="w-4 h-4 text-emerald-500 mr-2" />
        <span className="text-xs font-medium text-zinc-300">
          Tỷ giá: <span className="text-emerald-400 font-bold">{rate ? formatVND(rate) : "---"} / 1M</span>
        </span>
      </div>
    </header>
  );
}

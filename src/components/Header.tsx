"use client";

import Link from "next/link";
import { Crown, Zap } from "lucide-react";
import { formatVND } from "@/lib/utils";

interface HeaderProps {
  rate: number;
}

export default function Header({ rate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0a0a0f]/90 border-b border-[#1e1e2e]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
            <Crown className="w-6 h-6 text-[#0a0a0f] fill-[#0a0a0f]" />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent tracking-tight">
            KingMC Shop
          </span>
        </Link>

        {/* Center/Right: Live Rate Badge */}
        <div className="flex items-center gap-2 bg-[#12121a] border border-emerald-500/40 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-200">
            Tỷ giá hôm nay: <span className="text-emerald-400 font-extrabold text-sm sm:text-base">{rate ? formatVND(rate) : "10,000đ"} / 1M</span>
          </span>
        </div>
      </div>
    </header>
  );
}

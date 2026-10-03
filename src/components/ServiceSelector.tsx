'use client';

import React from 'react';
import { Coins, Crown, Sword, Zap, CreditCard } from 'lucide-react';
import { BaseKingService, ServiceId } from '@/services';
import { cn } from '@/lib/utils';

interface ServiceSelectorProps {
  services: BaseKingService[];
  activeId: ServiceId;
  onSelect: (id: ServiceId) => void;
}

export default function ServiceSelector({
  services,
  activeId,
  onSelect,
}: ServiceSelectorProps) {
  const getIcon = (iconName: string, active: boolean) => {
    const className = cn("w-5 h-5", active ? "text-emerald-400" : "text-zinc-400");
    switch (iconName) {
      case 'Coins':
        return <Coins className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      case 'Sword':
        return <Sword className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'CreditCard':
        return <CreditCard className={className} />;
      default:
        return <Coins className={className} />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-3">
        <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">
          Danh mục dịch vụ KingMC
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 p-1.5 rounded-2xl bg-[#12121a]/80 border border-[#1e1e2e] backdrop-blur-md">
        {services.map((srv) => {
          const isActive = srv.id === activeId;
          return (
            <button
              key={srv.id}
              onClick={() => onSelect(srv.id)}
              className={cn(
                "relative group flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border transition-all text-center",
                isActive
                  ? "bg-gradient-to-b from-[#1a1a2e] to-[#12121a] border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] -translate-y-0.5"
                  : "bg-[#0a0a0f]/60 border-[#1e1e2e] hover:border-emerald-500/30 hover:bg-[#161622]/60"
              )}
            >
              {/* Badge */}
              {srv.badge && (
                <span
                  className={cn(
                    "absolute -top-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                    isActive
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                      : "bg-[#1e1e2e] text-zinc-300 border-[#2e2e42]"
                  )}
                >
                  {srv.badge}
                </span>
              )}

              <div className="mb-2 mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] group-hover:scale-110 transition-transform">
                {getIcon(srv.iconName, isActive)}
              </div>

              <span
                className={cn(
                  "text-xs sm:text-sm font-bold tracking-tight line-clamp-1",
                  isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                )}
              >
                {srv.shortTitle}
              </span>

              {isActive && (
                <span className="mt-1 h-1 w-6 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

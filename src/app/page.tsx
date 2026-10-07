"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import OrderForm from "@/components/OrderForm";
import PaymentModal from "@/components/PaymentModal";
import AuthModal from "@/components/AuthModal";
import OrderHistoryModal from "@/components/OrderHistoryModal";
import OrderTicketModal from "@/components/OrderTicketModal";
import type { ShopSettings, Order } from "@/lib/types";
import { formatVND, formatNumber } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Zap, ShieldCheck, Clock, CheckCircle2, BellRing, AlertCircle, MessageSquare, Boxes, Coins } from "lucide-react";

export default function Home() {
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    rate_per_m: 0,
    bank_name: 'MB Bank',
    bank_id: 'MB',
    bank_account: '0123456789',
    bank_owner: 'NGUYEN VAN A',
    shop_notice: '',
    is_active: true,
    money_stock: 1000
  });
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth & Modals State
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTicketOrder, setActiveTicketOrder] = useState<Order | null>(null);

  // Check Supabase Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    async function fetchConfig() {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('kingmc_settings');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setShopSettings(prev => ({ ...prev, ...parsed }));
          } catch {}
        }
      }

      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data) {
            setShopSettings(prev => {
              const merged = { ...prev, ...data };
              if (typeof window !== 'undefined') {
                localStorage.setItem('kingmc_settings', JSON.stringify(merged));
              }
              return merged;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  // Mở Ticket Hỗ Trợ chung giữa Khách và Admin
  const handleOpenGeneralSupport = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const supportId = `SUPPORT-${user.id.slice(0, 8).toUpperCase()}`;
    const displayName = user?.user_metadata?.custom_claims?.global_name || 
                        user?.user_metadata?.full_name || 
                        user?.email?.split('@')[0] || 
                        'Thành Viên';

    const supportOrder: Order = {
      id: supportId,
      ign: displayName,
      money_m: 0,
      total_vnd: 0,
      status: 'completed',
      created_at: new Date().toISOString(),
      cancel_reason: null,
      user_id: user.id
    };

    setActiveTicketOrder(supportOrder);
  };

  return (
    <>
      <Header 
        rate={shopSettings.rate_per_m} 
        stock={shopSettings.money_stock}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenSupport={handleOpenGeneralSupport}
        onLogout={handleLogout}
      />

      <main className="flex-1 relative flex flex-col items-center justify-center py-8 md:py-12 px-4">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>

        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center space-y-6 md:space-y-8">
          
          {/* Announcement Notice if configured */}
          {shopSettings.shop_notice && (
            <div className="w-full max-w-xl mx-auto flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs sm:text-sm text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-fade-in">
              <BellRing className="h-4 w-4 shrink-0 text-amber-400 animate-bounce" />
              <span>{shopSettings.shop_notice}</span>
            </div>
          )}

          {/* Hero Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Server Minecraft KingMC • Hệ Thống Mua Bán Money Tự Động
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Nạp Money Ingame{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                KingMC
              </span>
            </h1>
            <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
              Mua bán Money /ah siêu tốc, uy tín, 0% thuế sàn và tạo mã VietQR tự động 24/7!
            </p>
          </div>

          {/* If Shop Inactive Warning */}
          {shopSettings.is_active === false && (
            <div className="w-full max-w-xl mx-auto rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300 text-sm flex items-center justify-center gap-2">
              <AlertCircle size={18} />
              <span>Shop hiện đang tạm ngưng nhận đơn mới để cập nhật kho. Vui lòng quay lại sau ít phút!</span>
            </div>
          )}

          {/* GIANT EXCHANGE RATE & STOCK DISPLAY BANNER */}
          <div className="w-full max-w-xl mx-auto rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#161622] to-[#0f0f18] p-5 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"></div>

            {/* Top Status Header */}
            <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-zinc-400">
                <Zap size={14} className="text-emerald-400 fill-emerald-400" />
                <span>BẢNG NIÊM YẾT HÔM NAY</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400">Trực Tuyến 24/7</span>
              </div>
            </div>

            {/* 2 Big Highlight Columns: Rate & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
              {/* Box 1: Tỷ Giá */}
              <div className="rounded-2xl border border-emerald-500/30 bg-[#0e0e16]/80 p-4 text-center flex flex-col justify-center items-center relative overflow-hidden group-hover:border-emerald-500/50 transition-colors">
                <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400 mb-1 flex items-center gap-1">
                  <Coins size={14} className="text-emerald-400" /> Tỷ Giá Niêm Yết
                </span>
                <div className="my-1.5 flex items-baseline justify-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">1M</span>
                  <span className="text-lg font-bold text-zinc-500">=</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    {formatVND(shopSettings.rate_per_m ?? 0)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">Mua tự động sàn /ah</span>
              </div>

              {/* Box 2: KHO MONEY (STOCK) - TO, RÕ RÀNG, DỄ NHÌN */}
              <div className="rounded-2xl border border-amber-500/30 bg-[#0e0e16]/80 p-4 text-center flex flex-col justify-center items-center relative overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.08)] group-hover:border-amber-500/50 transition-colors">
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <Boxes size={15} className="text-amber-400 animate-pulse" /> KHO MONEY SẴN CÓ
                </span>
                <div className="my-1.5 flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-[0_0_18px_rgba(245,158,11,0.4)] font-mono">
                    {formatNumber(shopSettings.money_stock !== undefined ? shopSettings.money_stock : 1000)}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-300">M</span>
                </div>
                <div>
                  {(shopSettings.money_stock !== undefined ? shopSettings.money_stock : 1000) <= 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      🔴 TẠM HẾT HÀNG
                    </span>
                  ) : (shopSettings.money_stock !== undefined ? shopSettings.money_stock : 1000) < 100 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      🟡 SẮP HẾT HÀNG
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      🟢 SẴN SÀNG GIAO DỊCH
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Key Trust Highlights */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1e1e2e] mt-4 text-[11px] sm:text-xs">
              <div className="flex flex-col items-center text-center gap-1 text-zinc-300">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="font-semibold">0% Thuế Sàn AH</span>
                <span className="text-[10px] text-zinc-500 hidden sm:block">Nhận đủ 100% tiền</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 text-zinc-300 border-x border-[#1e1e2e]">
                <Clock size={16} className="text-blue-400" />
                <span className="font-semibold">Duyệt Siêu Tốc</span>
                <span className="text-[10px] text-zinc-500 hidden sm:block">Admin mua trong 1-3p</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 text-zinc-300">
                <CheckCircle2 size={16} className="text-amber-400" />
                <span className="font-semibold">Mã VietQR Tự Động</span>
                <span className="text-[10px] text-zinc-500 hidden sm:block">Không lo nhập sai tiền</span>
              </div>
            </div>
          </div>

          {/* Money Order Form Component */}
          <OrderForm 
            settings={shopSettings} 
            userId={user?.id}
            onRequireAuth={() => setShowAuthModal(true)}
            onOrderCreated={(order) => setCreatedOrder(order)} 
          />

        </div>
      </main>

      {/* Footer (No admin links, purely public footer) */}
      <footer className="w-full border-t border-[#1e1e2e] bg-[#0a0a0f] py-6 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-400">© KingMC Shop</span>
          </div>
          <p className="text-xs text-zinc-600 max-w-md text-center md:text-right">
            Hệ thống mua bán Money ingame server Minecraft KingMC. Giao dịch an toàn, tiện lợi & tự động.
          </p>
        </div>
      </footer>

      {/* Payment Modal */}
      {createdOrder && (
        <PaymentModal 
          order={createdOrder} 
          settings={shopSettings} 
          onClose={() => setCreatedOrder(null)} 
          onOpenTicket={(order) => {
            setActiveTicketOrder(order);
          }}
        />
      )}

      {/* Auth Modal (Discord & Email) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* Order History Modal */}
      <OrderHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        userId={user?.id}
        userEmail={user?.email}
        onOpenPayment={(order) => {
          setCreatedOrder(order);
        }}
        onOpenTicket={(order) => {
          setActiveTicketOrder(order);
        }}
      />

      {/* Live Order Ticket Modal for Customer */}
      {activeTicketOrder && (
        <OrderTicketModal
          order={activeTicketOrder}
          isOpen={Boolean(activeTicketOrder)}
          onClose={() => setActiveTicketOrder(null)}
          isAdmin={false}
        />
      )}

      {/* Floating Support Ticket Button */}
      <button
        onClick={handleOpenGeneralSupport}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Mở Ticket Chat Hỗ Trợ Trực Tiếp với Admin"
      >
        <MessageSquare className="w-5 h-5 fill-black" />
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider">Ticket Hỗ Trợ</span>
      </button>
    </>
  );
}

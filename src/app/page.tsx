"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import OrderForm from "@/components/OrderForm";
import PaymentModal from "@/components/PaymentModal";
import AuthModal from "@/components/AuthModal";
import OrderHistoryModal from "@/components/OrderHistoryModal";
import ServiceSelector from "@/components/ServiceSelector";
import ServiceCatalog from "@/components/ServiceCatalog";
import { serviceRegistry, ServiceId, BaseKingService } from "@/services";
import { getCurrentUser, logoutUser, UserProfile } from "@/lib/auth";
import type { ShopSettings, Order } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { Zap, ShieldCheck, Clock, CheckCircle2, BellRing, AlertCircle } from "lucide-react";

export default function Home() {
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    rate_per_m: 10000,
    bank_name: 'MB Bank',
    bank_id: 'MB',
    bank_account: '0123456789',
    bank_owner: 'NGUYEN VAN A',
    shop_notice: '',
    is_active: true
  });
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // User auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Active KingMC Service class
  const [activeServiceId, setActiveServiceId] = useState<ServiceId>('money');
  const allServices = serviceRegistry.getAll();
  const currentService = serviceRegistry.getById(activeServiceId) || allServices[0];

  useEffect(() => {
    // Check logged in user on client load
    setCurrentUser(getCurrentUser());

    async function fetchConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setShopSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  return (
    <>
      <Header 
        rate={shopSettings.rate_per_m} 
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenHistory={() => setHistoryModalOpen(true)}
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
              Server Minecraft KingMC • Hệ Thống Dịch Vụ Số 1
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Dịch Vụ Game{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                KingMC
              </span>
            </h1>
            <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
              Mua bán Money /ah, Rank VIP, Vũ Khí Thần Thoại & Cày Thuê trọn gói tự động 24/7!
            </p>
          </div>

          {/* SERVICE CLASS SELECTOR: Switch between Money, Rank, Items, Boosting, Topup */}
          <ServiceSelector
            services={allServices}
            activeId={activeServiceId}
            onSelect={(id) => setActiveServiceId(id)}
          />

          {/* If Shop Inactive Warning */}
          {shopSettings.is_active === false && (
            <div className="w-full max-w-xl mx-auto rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300 text-sm flex items-center justify-center gap-2">
              <AlertCircle size={18} />
              <span>Shop hiện đang tạm ngưng nhận đơn mới để cập nhật kho. Vui lòng quay lại sau ít phút!</span>
            </div>
          )}

          {/* CONTENT ACCORDING TO SELECTED SERVICE CLASS */}
          {activeServiceId === 'money' ? (
            <>
              {/* GIANT EXCHANGE RATE DISPLAY BANNER FOR MONEY */}
              <div className="w-full max-w-xl mx-auto rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#161622] to-[#0f0f18] p-5 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl"></div>
                
                <p className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-1 flex items-center justify-center gap-1.5">
                  <Zap size={15} className="text-emerald-400 fill-emerald-400" />
                  <span>BẢNG TỶ GIÁ NIÊM YẾT HÔM NAY</span>
                </p>

                <div className="my-2 flex items-baseline justify-center gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">1M</span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-400">=</span>
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    {formatVND(shopSettings.rate_per_m)}
                  </span>
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
                user={currentUser}
                onOrderCreated={(order) => setCreatedOrder(order)} 
              />
            </>
          ) : (
            /* Other Service Classes: Rank, Items, Boosting, Topup */
            <ServiceCatalog
              service={currentService}
              settings={shopSettings}
              user={currentUser}
              onOrderCreated={(order) => setCreatedOrder(order)}
              onOpenAuth={() => handleOpenAuth('login')}
            />
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1e1e2e] bg-[#0a0a0f] py-6 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-400">© KingMC Shop</span>
            <span className="text-zinc-600">•</span>
            <Link href="/admin" className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
              Trang Quản Trị (/admin)
            </Link>
          </div>
          <p className="text-xs text-zinc-600 max-w-md text-center md:text-right">
            Hệ sinh thái dịch vụ Minecraft server KingMC. Giao dịch an toàn, tiện lợi & tự động.
          </p>
        </div>
      </footer>

      {/* Auth Modal for Customer Login / Register */}
      <AuthModal
        isOpen={authModalOpen}
        defaultMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(usr) => setCurrentUser(usr)}
      />

      {/* Order History Modal for Customer */}
      {currentUser && (
        <OrderHistoryModal
          isOpen={historyModalOpen}
          user={currentUser}
          settings={shopSettings}
          onClose={() => setHistoryModalOpen(false)}
          onSelectOrderToPay={(order) => setCreatedOrder(order)}
        />
      )}

      {/* Payment Modal */}
      {createdOrder && (
        <PaymentModal 
          order={createdOrder} 
          settings={shopSettings} 
          onClose={() => setCreatedOrder(null)} 
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import OrderForm from "@/components/OrderForm";
import PaymentModal from "@/components/PaymentModal";
import type { ShopSettings, Order } from "@/lib/types";

export default function Home() {
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setShopSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  return (
    <>
      <Header rate={shopSettings?.rate_per_m || 0} />

      <main className="flex-1 relative flex flex-col items-center justify-center py-12 px-4">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center space-y-8">
          
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Chào mừng đến với{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                KingMC Shop
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Hệ thống mua bán Money Minecraft tự động, an toàn và nhanh chóng nhất.
              Giao dịch 24/7 với tỷ giá tốt nhất thị trường.
            </p>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : shopSettings ? (
            <OrderForm 
              settings={shopSettings} 
              onOrderCreated={(order) => setCreatedOrder(order)} 
            />
          ) : (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
              Không thể tải cấu hình cửa hàng. Vui lòng thử lại sau.
            </div>
          )}
        </div>
      </main>

      <footer className="w-full border-t border-[#1e1e2e] bg-[#0a0a0f] py-6 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} KingMC Shop. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600 max-w-md text-center md:text-right">
            KingMC Shop không liên kết chính thức với Mojang AB hoặc Microsoft.
            Minecraft là thương hiệu của Mojang Synergies AB.
          </p>
        </div>
      </footer>

      {createdOrder && shopSettings && (
        <PaymentModal 
          order={createdOrder} 
          settings={shopSettings} 
          onClose={() => setCreatedOrder(null)} 
        />
      )}
    </>
  );
}

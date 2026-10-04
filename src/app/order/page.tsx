"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, ArrowLeft, Loader2, MessageSquare, QrCode, ShoppingBag, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Order, ShopSettings } from "@/lib/types";
import { formatVND, getStatusColor, getStatusLabel } from "@/lib/utils";
import PaymentModal from "@/components/PaymentModal";
import OrderTicketModal from "@/components/OrderTicketModal";

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }

    async function loadData() {
      try {
        const [orderRes, configRes] = await Promise.all([
          fetch(`/api/orders?status=all`),
          fetch('/api/config')
        ]);

        if (configRes.ok) {
          const cfg = await configRes.json();
          setSettings(cfg);
        }

        if (orderRes.ok) {
          const orders: Order[] = await orderRes.json();
          const found = orders.find(o => o.id === orderId);
          if (found) {
            setOrder(found);
          }
        }
      } catch (err) {
        console.error('Fetch order error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4 text-zinc-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm text-zinc-400">Đang tìm thông tin đơn hàng #{orderId}...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4 text-zinc-100 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto text-zinc-500">
          <ShoppingBag size={28} />
        </div>
        <h2 className="text-xl font-bold text-white">Không tìm thấy đơn hàng</h2>
        <p className="text-xs text-zinc-400 max-w-md">
          Mã đơn #{orderId} không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại đường dẫn!
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs"
        >
          <ArrowLeft size={16} />
          <span>Về trang chủ KingMC</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold">
            <ArrowLeft size={16} />
            <span>Về Trang Chủ</span>
          </Link>
          <span className="text-sm font-bold text-emerald-400 font-mono">Đơn #{order.id}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 my-auto space-y-6">
        <div className="rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1e2e] pb-5">
            <div>
              <span className="text-xs text-zinc-500">Chi tiết đơn hàng:</span>
              <h1 className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">#{order.id}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e]">
              <span className="text-zinc-500 text-xs block mb-1">Tên nhân vật (IGN):</span>
              <strong className="text-emerald-400 font-mono text-base">{order.ign}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e]">
              <span className="text-zinc-500 text-xs block mb-1">Số Money mua:</span>
              <strong className="text-white text-base">{order.money_m}M Ingame</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e]">
              <span className="text-zinc-500 text-xs block mb-1">Tổng tiền thanh toán:</span>
              <strong className="text-amber-400 text-base">{formatVND(order.total_vnd)}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e]">
              <span className="text-zinc-500 text-xs block mb-1">Thời gian đặt:</span>
              <span className="text-zinc-300 text-xs">{new Date(order.created_at).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {order.cancel_reason && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              <strong>Lý do hủy đơn:</strong> {order.cancel_reason}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setShowTicket(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(88,101,242,0.3)]"
            >
              <MessageSquare size={16} />
              <span>💬 Mở Ticket Chat Với Admin</span>
            </button>

            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <button
                onClick={() => setShowPayment(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <QrCode size={16} />
                <span>Xem QR & Chuyển Khoản</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showPayment && settings && (
        <PaymentModal
          order={order}
          settings={settings}
          onClose={() => setShowPayment(false)}
          onOpenTicket={() => {
            setShowPayment(false);
            setShowTicket(true);
          }}
        />
      )}

      {showTicket && (
        <OrderTicketModal
          order={order}
          isOpen={showTicket}
          onClose={() => setShowTicket(false)}
          isAdmin={false}
        />
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400 text-xs">
        Đang tải...
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  );
}

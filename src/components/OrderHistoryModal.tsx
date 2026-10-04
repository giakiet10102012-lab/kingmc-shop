"use client";

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Clock, CheckCircle2, XCircle, Search, MessageSquare, QrCode, Loader2, ArrowRight } from 'lucide-react';
import { Order } from '@/lib/types';
import { formatVND, getStatusColor, getStatusLabel } from '@/lib/utils';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  userEmail?: string | null;
  onOpenPayment: (order: Order) => void;
  onOpenTicket: (order: Order) => void;
}

export default function OrderHistoryModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  onOpenPayment,
  onOpenTicket,
}: OrderHistoryModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchIgn, setSearchIgn] = useState('');

  const fetchOrders = async (ignQuery?: string) => {
    setLoading(true);
    try {
      let url = '/api/orders?status=all';
      if (userId) {
        url += `&user_id=${userId}`;
      } else if (ignQuery?.trim()) {
        url += `&ign=${encodeURIComponent(ignQuery.trim())}`;
      } else {
        // Fallback to localStorage saved order IDs if available
        let savedIds: string[] = [];
        if (typeof window !== 'undefined') {
          try {
            savedIds = JSON.parse(localStorage.getItem('kingmc_my_orders') || '[]');
          } catch {}
        }
        if (savedIds.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Fetch order history error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(searchIgn);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-3xl border border-[#1e1e2e] bg-[#12121a] shadow-2xl text-zinc-100 flex flex-col h-[85vh] max-h-[720px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[#1e1e2e] p-5 bg-gradient-to-r from-[#161622] via-[#12121a] to-[#161622] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Lịch Sử Mua Hàng
              </h3>
              <p className="text-xs text-zinc-400">
                {userId 
                  ? `Tài khoản: ${userEmail || 'Thành viên KingMC'}`
                  : 'Tra cứu các đơn hàng đã đặt mua'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search bar for IGN if not logged in or searching other orders */}
        <form onSubmit={handleSearch} className="p-4 border-b border-[#1e1e2e] bg-[#0a0a0f] flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchIgn}
              onChange={(e) => setSearchIgn(e.target.value)}
              placeholder="Nhập tên nhân vật (IGN) để tra cứu..."
              className="w-full bg-[#12121a] border border-[#1e1e2e] focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#1e1e2e] hover:bg-emerald-500 hover:text-black text-xs font-bold transition-all text-zinc-300"
          >
            Tìm Kiếm
          </button>
        </form>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e0e14]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <span>Đang tải lịch sử đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
                <ShoppingBag size={24} />
              </div>
              <p className="text-sm font-semibold text-zinc-400">Không tìm thấy đơn hàng nào</p>
              <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                Nếu bạn vừa tạo đơn, hãy kiểm tra lại tên IGN hoặc đăng nhập để liên kết đơn với tài khoản.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id}
                className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4 sm:p-5 shadow-lg hover:border-emerald-500/30 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e1e2e] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      #{order.id}
                    </span>
                    <span className="text-xs text-zinc-400">
                      • {new Date(order.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Tên nhân vật (IGN):</span>
                    <strong className="text-white text-sm font-mono">{order.ign}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Số Money mua:</span>
                    <strong className="text-emerald-400 text-sm">{order.money_m}M</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-zinc-500 block">Tổng tiền VNĐ:</span>
                    <strong className="text-white text-sm">{formatVND(order.total_vnd)}</strong>
                  </div>
                </div>

                {order.cancel_reason && (
                  <div className="text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                    <strong>Lý do hủy:</strong> {order.cancel_reason}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {/* Open Ticket Button */}
                  <button
                    onClick={() => {
                      onOpenTicket(order);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1e1e2e] hover:bg-emerald-500 hover:text-black text-xs font-bold text-zinc-300 transition-all"
                  >
                    <MessageSquare size={14} />
                    <span>Chat Ticket Đơn Hàng</span>
                  </button>

                  {/* If not completed/cancelled, allow viewing payment QR */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        onOpenPayment(order);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <QrCode size={14} />
                      <span>Xem Mã QR Thanh Toán</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

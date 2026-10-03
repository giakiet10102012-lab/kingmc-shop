'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, History, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Order, ShopSettings } from '@/lib/types';
import { formatVND, formatNumber, getStatusColor, getStatusLabel } from '@/lib/utils';
import { UserProfile } from '@/lib/auth';

interface OrderHistoryModalProps {
  isOpen: boolean;
  user: UserProfile;
  settings: ShopSettings;
  onClose: () => void;
  onSelectOrderToPay: (order: Order) => void;
}

export default function OrderHistoryModal({
  isOpen,
  user,
  settings,
  onClose,
  onSelectOrderToPay,
}: OrderHistoryModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?ign=${encodeURIComponent(user.username)}&user_id=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.username, user.id]);

  useEffect(() => {
    if (isOpen) {
      fetchUserOrders();
    }
  }, [isOpen, fetchUserOrders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Lịch Sử Đơn Hàng</h2>
              <p className="text-xs text-zinc-400">
                Tài khoản: <span className="font-semibold text-emerald-400">{user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserOrders}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="text-xs">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <AlertCircle size={36} className="mx-auto text-zinc-600" />
              <p className="text-sm font-semibold">Chưa có đơn hàng nào</p>
              <p className="text-xs text-zinc-500">
                Các đơn hàng bạn đặt với IGN <span className="text-zinc-400">{user.username}</span> sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const dateStr = new Date(ord.created_at).toLocaleString('vi-VN');
              return (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{ord.id}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(ord.status)}`}>
                        {getStatusLabel(ord.status)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      IGN: <span className="font-medium text-zinc-200">{ord.ign}</span> • Số lượng: <span className="font-medium text-zinc-200">{ord.money_m}M</span> • Tổng tiền: <span className="font-bold text-emerald-400">{formatVND(ord.total_vnd)}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500">{dateStr}</p>
                    {ord.cancel_reason && (
                      <p className="text-[11px] text-red-400">Lý do hủy: {ord.cancel_reason}</p>
                    )}
                  </div>

                  {ord.status === 'pending' && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectOrderToPay(ord);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-600 transition-colors shrink-0"
                    >
                      <span>Thanh toán</span>
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Order, ShopSettings } from '@/lib/types';
import { cn, formatNumber, formatVND, getStatusColor, getStatusLabel } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface AdminDashboardProps {
  pin: string;
}

export default function AdminDashboard({ pin }: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    rate_per_m: 0,
    bank_name: '',
    bank_id: '',
    bank_account: '',
    bank_owner: ''
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelDropdown, setCancelDropdown] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=all', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (res.ok) setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchSettings();

    const channel = supabase.channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  const saveSettings = async () => {
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(settings)
      });
      alert('Đã lưu cài đặt!');
    } catch (e) {
      alert('Lỗi lưu cài đặt');
    }
  };

  const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, status, cancel_reason: reason })
      });
      setCancelDropdown(null);
      setCancelReason('');
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'paid_waiting').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'pending' || o.status === 'paid_waiting';
    return o.status === activeTab;
  });

  const cancelReasonsList = ['Sai nội dung CK', 'Chưa nhận được tiền', 'Khách yêu cầu hủy'];

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Settings Panel */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex w-full items-center justify-between p-6 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Settings className="text-emerald-500" />
              <h2 className="text-xl font-bold">Cài Đặt Hệ Thống</h2>
            </div>
            {isSettingsOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {isSettingsOpen && (
            <div className="border-t border-[#1e1e2e] p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Tỷ giá (VNĐ/1M)</label>
                  <input type="number" value={settings.rate_per_m} onChange={e => setSettings({...settings, rate_per_m: Number(e.target.value)})} className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-zinc-100 outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Tên ngân hàng</label>
                  <input type="text" value={settings.bank_name} onChange={e => setSettings({...settings, bank_name: e.target.value})} className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-zinc-100 outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Mã ngân hàng (VietQR)</label>
                  <input type="text" value={settings.bank_id} onChange={e => setSettings({...settings, bank_id: e.target.value})} className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-zinc-100 outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Số tài khoản</label>
                  <input type="text" value={settings.bank_account} onChange={e => setSettings({...settings, bank_account: e.target.value})} className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-zinc-100 outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Chủ tài khoản</label>
                  <input type="text" value={settings.bank_owner} onChange={e => setSettings({...settings, bank_owner: e.target.value})} className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-zinc-100 outline-none focus:border-emerald-500" />
                </div>
              </div>
              <button onClick={saveSettings} className="mt-6 rounded-xl bg-emerald-500 px-6 py-2.5 font-semibold text-white hover:bg-emerald-600 transition-colors">
                Lưu Cài Đặt
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 flex items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-3 text-blue-500"><ShoppingBag size={24} /></div>
            <div><p className="text-sm text-zinc-400">Tổng đơn</p><p className="text-2xl font-bold">{stats.total}</p></div>
          </div>
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 flex items-center gap-4">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-500"><Clock size={24} /></div>
            <div><p className="text-sm text-zinc-400">Chờ duyệt</p><p className="text-2xl font-bold">{stats.pending}</p></div>
          </div>
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 flex items-center gap-4">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500"><CheckCircle2 size={24} /></div>
            <div><p className="text-sm text-zinc-400">Hoàn thành</p><p className="text-2xl font-bold">{stats.completed}</p></div>
          </div>
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 flex items-center gap-4">
            <div className="rounded-full bg-red-500/10 p-3 text-red-500"><XCircle size={24} /></div>
            <div><p className="text-sm text-zinc-400">Đã hủy</p><p className="text-2xl font-bold">{stats.cancelled}</p></div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a]">
          <div className="border-b border-[#1e1e2e] p-4 flex gap-4 overflow-x-auto">
            {['all', 'pending', 'completed', 'cancelled'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn("whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors", activeTab === tab ? "bg-[#1e1e2e] text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e2e]/50")}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'pending' ? 'Chờ duyệt' : tab === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
              </button>
            ))}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e2e]/50 text-zinc-400">
                <tr>
                  <th className="p-4 font-medium">Mã Đơn</th>
                  <th className="p-4 font-medium">Thời Gian</th>
                  <th className="p-4 font-medium">IGN</th>
                  <th className="p-4 font-medium">Số M</th>
                  <th className="p-4 font-medium">Tổng VNĐ</th>
                  <th className="p-4 font-medium">Trạng Thái</th>
                  <th className="p-4 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e]">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#1e1e2e]/20">
                    <td className="p-4 font-mono text-emerald-500">{order.id}</td>
                    <td className="p-4 text-zinc-400">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                    <td className="p-4 font-medium">{order.ign}</td>
                    <td className="p-4">{formatNumber(order.money_m)}M</td>
                    <td className="p-4 text-amber-500">{formatVND(order.total_vnd)}</td>
                    <td className="p-4">
                      <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-medium", getStatusColor(order.status))}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.cancel_reason && (
                         <div className="mt-1 text-xs text-red-400">{order.cancel_reason}</div>
                      )}
                    </td>
                    <td className="p-4">
                      {(order.status === 'pending' || order.status === 'paid_waiting') && (
                        <div className="flex gap-2 relative">
                          {order.status === 'paid_waiting' && (
                            <button onClick={() => updateOrderStatus(order.id, 'completed')} title="Xác Nhận Đã Mua AH" className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-emerald-500 hover:bg-emerald-500/30">
                              <Check size={16} /> <span className="hidden xl:inline">Xác Nhận Đã Mua AH</span>
                            </button>
                          )}
                          <div className="relative">
                            <button onClick={() => setCancelDropdown(cancelDropdown === order.id ? null : order.id)} title="Hủy Đơn" className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-red-500 hover:bg-red-500/30">
                              <X size={16} /> <span className="hidden xl:inline">Hủy Đơn</span>
                            </button>
                            
                            {cancelDropdown === order.id && (
                              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#1e1e2e] bg-[#12121a] p-3 shadow-xl z-10">
                                <p className="mb-2 text-xs font-medium text-zinc-400">Lý do hủy:</p>
                                <div className="space-y-1 mb-2">
                                  {cancelReasonsList.map(r => (
                                    <button key={r} onClick={() => setCancelReason(r)} className={cn("block w-full text-left rounded p-2 text-sm", cancelReason === r ? "bg-[#1e1e2e] text-white" : "text-zinc-400 hover:bg-[#1e1e2e]/50")}>{r}</button>
                                  ))}
                                </div>
                                <input type="text" placeholder="Lý do khác..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="mb-2 w-full rounded border border-[#1e1e2e] bg-[#0a0a0f] p-2 text-sm text-white outline-none focus:border-red-500" />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setCancelDropdown(null)} className="rounded px-3 py-1 text-xs text-zinc-400 hover:text-white">Đóng</button>
                                  <button onClick={() => updateOrderStatus(order.id, 'cancelled', cancelReason)} className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">Xác nhận Hủy</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">Không có đơn hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

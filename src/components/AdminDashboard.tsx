'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Settings, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  RefreshCw, 
  Coins, 
  DollarSign, 
  Search, 
  BellRing, 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  QrCode, 
  Save, 
  Radio,
  Package,
  ImageIcon
} from 'lucide-react';
import { Order, ShopSettings } from '@/lib/types';
import { cn, formatNumber, formatVND, getStatusColor, getStatusLabel } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import AdminCatalogManager from './AdminCatalogManager';

interface AdminDashboardProps {
  pin: string;
}

const POPULAR_BANKS = [
  { id: 'MB', name: 'MB Bank (Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ACB', name: 'ACB (Á Châu)' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'VBA', name: 'Agribank' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'MSB', name: 'MSB' },
  { id: 'OCB', name: 'OCB' },
];

export default function AdminDashboard({ pin }: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    rate_per_m: 10000,
    bank_name: 'MB Bank',
    bank_id: 'MB',
    bank_account: '0123456789',
    bank_owner: 'NGUYEN VAN A',
    shop_notice: '',
    is_active: true,
    qr_image_url: '',
    custom_catalog: ''
  });

  const [activeMainSection, setActiveMainSection] = useState<'orders' | 'catalog' | 'settings'>('orders');
  const [activeTab, setActiveTab] = useState<'all' | 'paid_waiting' | 'pending' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelDropdown, setCancelDropdown] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreviewQr, setShowPreviewQr] = useState(false);

  // Fetch orders
  const fetchOrders = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders?status=all', { headers: { 'x-admin-pin': pin } });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('kingmc_settings');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch {}
        }
      }

      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          setSettings(prev => {
            const merged = { ...prev, ...data };
            if (typeof window !== 'undefined') {
              localStorage.setItem('kingmc_settings', JSON.stringify(merged));
            }
            return merged;
          });
        }
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchSettings();

    // Supabase Realtime subscription
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  // Save Settings
  const saveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Save to localStorage immediately as persistent client fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingmc_settings', JSON.stringify(settings));
    }

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-admin-pin': pin ? pin.trim() : '' 
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errMsg = data?.error || (res.status ? `Mã HTTP ${res.status}` : 'Không rõ');
        setSaveSuccess(true);
        alert(`Đã lưu cấu hình thành công vào bộ nhớ máy!\n(Lưu ý phản hồi từ máy chủ: ${errMsg})`);
      }
    } catch (e: any) {
      console.warn('Network save settings error:', e);
      setSaveSuccess(true);
      alert('Đã lưu cấu hình vào bộ nhớ máy thành công! (Máy chủ hiện đang gián đoạn kết nối)');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Catalog
  const handleSaveCatalog = async (newCatalogJson: string) => {
    const updatedSettings = { ...settings, custom_catalog: newCatalogJson };
    setSettings(updatedSettings);
    setIsSaving(true);

    // Save to localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingmc_settings', JSON.stringify(updatedSettings));
      localStorage.setItem('kingmc_custom_catalog', newCatalogJson);
    }

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-admin-pin': pin ? pin.trim() : '' 
        },
        body: JSON.stringify(updatedSettings)
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        alert('Đã lưu toàn bộ danh mục mặt hàng thành công!');
      } else {
        const errMsg = data?.error || (res.status ? `Mã HTTP ${res.status}` : 'Không rõ');
        alert(`Đã lưu danh mục vào bộ nhớ máy thành công!\n(Lưu ý phản hồi từ máy chủ: ${errMsg})`);
      }
    } catch (e: any) {
      console.warn('Network save catalog error:', e);
      alert('Đã lưu danh mục vào bộ nhớ máy thành công! (Máy chủ hiện đang gián đoạn kết nối)');
    } finally {
      setIsSaving(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, status, cancel_reason: reason })
      });
      if (res.ok) {
        setCancelDropdown(null);
        setCancelReason('');
        fetchOrders();
      }
    } catch (e) {
      console.error('Update order status error:', e);
    }
  };

  // Quick Bank Selection
  const handleSelectBank = (bank: { id: string; name: string }) => {
    setSettings(prev => ({
      ...prev,
      bank_id: bank.id,
      bank_name: bank.name
    }));
  };

  // Financial Stats
  const stats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((acc, curr) => acc + (Number(curr.total_vnd) || 0), 0);
    const totalM = completedOrders.reduce((acc, curr) => acc + (Number(curr.money_m) || 0), 0);

    return {
      total: orders.length,
      waitingAdmin: orders.filter(o => o.status === 'paid_waiting').length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: completedOrders.length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue,
      totalM
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Tab filter
      if (activeTab === 'paid_waiting' && o.status !== 'paid_waiting') return false;
      if (activeTab === 'pending' && o.status !== 'pending') return false;
      if (activeTab === 'completed' && o.status !== 'completed') return false;
      if (activeTab === 'cancelled' && o.status !== 'cancelled') return false;

      // Search term filter (IGN or Order ID)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchId = o.id.toLowerCase().includes(term);
        const matchIgn = o.ign.toLowerCase().includes(term);
        return matchId || matchIgn;
      }
      return true;
    });
  }, [orders, activeTab, searchTerm]);

  const cancelReasonsList = [
    'Sai nội dung chuyển khoản',
    'Chưa nhận được tiền',
    'Không tìm thấy món đồ trên /ah',
    'Khách yêu cầu hủy đơn',
    'Sai số tiền chuyển'
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-emerald-400">Realtime Sync</span>
            </div>

            <div className="h-4 w-px bg-[#1e1e2e] hidden sm:block"></div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-medium text-emerald-400">
              <TrendingUp size={14} />
              <span>Tỷ giá: <strong>{formatVND(settings.rate_per_m)} / 1M</strong></span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-1 text-xs text-zinc-400">
              <span>Trạng thái: </span>
              <span className={cn("font-bold", settings.is_active !== false ? "text-emerald-400" : "text-amber-400")}>
                {settings.is_active !== false ? "🟢 Mở cửa" : "🟡 Tạm đóng"}
              </span>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin text-emerald-500")} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>

        {/* 3 TOP-LEVEL WORKSPACE TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
          <button
            onClick={() => setActiveMainSection('orders')}
            className={cn(
              "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold transition-all",
              activeMainSection === 'orders'
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-[#1a1a28]"
            )}
          >
            <ShoppingBag size={18} />
            <span>Quản Lý Đơn Hàng</span>
            {stats.waitingAdmin > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-black",
                activeMainSection === 'orders' ? "bg-black text-white" : "bg-red-500 text-white animate-pulse"
              )}>
                {stats.waitingAdmin}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainSection('catalog')}
            className={cn(
              "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold transition-all",
              activeMainSection === 'catalog'
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-[#1a1a28]"
            )}
          >
            <Package size={18} />
            <span>Quản Lý Mặt Hàng & Dịch Vụ</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold",
              activeMainSection === 'catalog' ? "bg-black/20 text-black" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            )}>
              Thêm / Sửa / Xóa
            </span>
          </button>

          <button
            onClick={() => setActiveMainSection('settings')}
            className={cn(
              "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold transition-all",
              activeMainSection === 'settings'
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-[#1a1a28]"
            )}
          >
            <Settings size={18} />
            <span>Cài Đặt Tỷ Giá & Ngân Hàng / QR</span>
          </button>
        </div>

        {/* SECTION 1: CATALOG MANAGEMENT */}
        {activeMainSection === 'catalog' && (
          <AdminCatalogManager
            catalogJson={settings.custom_catalog}
            onSaveCatalog={handleSaveCatalog}
            isSaving={isSaving}
          />
        )}

        {/* SECTION 2: SHOP & BANK SETTINGS */}
        {activeMainSection === 'settings' && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="border-b border-[#1e1e2e] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#12121a] via-[#1a1a28] to-[#12121a]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Settings className="text-emerald-400" size={22} />
                  <span>Cài Đặt Cấu Hình Shop & Ngân Hàng</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Thay đổi tỷ giá VNĐ, đóng/mở nhận đơn, thông báo ghim và ảnh mã QR ngân hàng.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-400 animate-fade-in">
                    <Check size={16} />
                    <span>Đã lưu thành công!</span>
                  </div>
                )}
                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-bold text-[#0a0a0f] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{isSaving ? "Đang lưu..." : "LƯU CÀI ĐẶT"}</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Row 1: Tỷ Giá & Trạng Thái */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tỷ giá */}
                <div className="space-y-3 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <TrendingUp size={16} />
                      <span>Tỷ giá quy đổi (VNĐ / 1M)</span>
                    </label>
                    <span className="text-xs text-zinc-400">Khách trả cho mỗi 1M</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={settings.rate_per_m} 
                      onChange={e => setSettings({...settings, rate_per_m: Number(e.target.value)})}
                      placeholder="VD: 10000"
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] px-4 py-3 text-lg font-bold text-emerald-400 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                      VNĐ / 1M
                    </div>
                  </div>

                  {/* Quick adjustment buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[5000, 8000, 10000, 12000, 15000, 20000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSettings({...settings, rate_per_m: val})}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                          settings.rate_per_m === val 
                            ? "bg-emerald-500 text-[#0a0a0f]" 
                            : "border border-[#1e1e2e] bg-[#12121a] text-zinc-300 hover:border-emerald-500/40"
                        )}
                      >
                        {formatVND(val)}
                      </button>
                    ))}
                  </div>

                  {/* Live Preview calculation */}
                  <div className="rounded-lg bg-[#12121a] p-3 text-xs text-zinc-400 border border-[#1e1e2e]/50 flex justify-between items-center">
                    <span>Mẫu thử: <strong>10M</strong> sẽ có giá:</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatVND(settings.rate_per_m * 10)}</span>
                  </div>
                </div>

                {/* Trạng thái Shop & Thông báo */}
                <div className="space-y-3 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Radio size={16} className="text-emerald-400" />
                      <span>Trạng thái mở cửa Shop</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings({...settings, is_active: settings.is_active === false ? true : false})}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                        settings.is_active !== false 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                          : "bg-red-500/20 text-red-400 border border-red-500/40"
                      )}
                    >
                      {settings.is_active !== false ? "Đang nhận đơn (Bật)" : "Tạm ngưng nhận đơn (Tắt)"}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <BellRing size={14} className="text-amber-400" />
                      <span>Thông báo ghim đầu trang chủ (Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={settings.shop_notice || ''}
                      onChange={e => setSettings({...settings, shop_notice: e.target.value})}
                      placeholder="VD: Server KingMC vừa cập nhật Season mới, nạp tiền duyệt siêu tốc 24/7!"
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-zinc-500">Để trống nếu không muốn hiển thị banner thông báo.</p>
                  </div>
                </div>
              </div>

              {/* Row 2: Cấu hình Tài Khoản Ngân Hàng & Custom QR */}
              <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-blue-400" size={18} />
                    <span className="text-sm font-bold text-zinc-200">Thông tin Ngân Hàng Nhận Tiền & Mã QR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreviewQr(!showPreviewQr)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] bg-[#12121a] px-2.5 py-1 text-xs text-zinc-300 hover:text-emerald-400"
                  >
                    <QrCode size={14} />
                    <span>{showPreviewQr ? "Ẩn QR test" : "Xem thử mã QR"}</span>
                  </button>
                </div>

                {/* Quick Select Popular Bank */}
                <div>
                  <span className="text-xs text-zinc-400 block mb-2">Chọn nhanh ngân hàng phổ biến:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_BANKS.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBank(b)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                          settings.bank_id === b.id
                            ? "bg-blue-500 text-white font-bold"
                            : "border border-[#1e1e2e] bg-[#12121a] text-zinc-400 hover:text-zinc-200 hover:border-blue-500/40"
                        )}
                      >
                        {b.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Tên ngân hàng</label>
                    <input 
                      type="text" 
                      value={settings.bank_name} 
                      onChange={e => setSettings({...settings, bank_name: e.target.value})} 
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Mã ngân hàng (VietQR)</label>
                    <input 
                      type="text" 
                      value={settings.bank_id} 
                      onChange={e => setSettings({...settings, bank_id: e.target.value.toUpperCase()})} 
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] p-2.5 text-sm font-mono text-emerald-400 outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={settings.bank_account} 
                      onChange={e => setSettings({...settings, bank_account: e.target.value})} 
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] p-2.5 text-sm font-mono text-amber-400 outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Tên chủ tài khoản</label>
                    <input 
                      type="text" 
                      value={settings.bank_owner} 
                      onChange={e => setSettings({...settings, bank_owner: e.target.value.toUpperCase()})} 
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] p-2.5 text-sm uppercase text-zinc-100 outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                {/* Custom QR Image Link Input */}
                <div className="space-y-2 pt-3 border-t border-[#1e1e2e]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <ImageIcon size={16} />
                      <span>Link ảnh mã QR Ngân Hàng / Ví tùy chỉnh (Tùy chọn)</span>
                    </label>
                    <span className="text-[11px] text-zinc-400">Dán link ảnh online (Imgur, Postimg, Drive...)</span>
                  </div>
                  <input
                    type="text"
                    value={settings.qr_image_url || ''}
                    onChange={e => setSettings({...settings, qr_image_url: e.target.value.trim()})}
                    placeholder="https://i.imgur.com/vi-du-anh-qr.png (Để trống nếu dùng VietQR tự động theo tài khoản trên)"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    💡 Nếu bạn dán link ảnh mã QR cố định vào đây, khách khi đặt hàng sẽ quét ảnh QR này để chuyển khoản. Nếu để trống, hệ thống tự động tạo mã VietQR theo Số tài khoản & Ngân hàng ở trên.
                  </p>

                  {settings.qr_image_url && settings.qr_image_url.trim().length > 0 && (
                    <div className="pt-2 flex items-center gap-4 bg-[#12121a] p-3 rounded-xl border border-emerald-500/30">
                      <img
                        src={settings.qr_image_url}
                        alt="Custom QR Preview"
                        className="w-24 h-24 object-contain rounded-lg border border-white/20 bg-white p-1"
                        onError={(e) => {
                          (e.target as any).src = "https://via.placeholder.com/150?text=Loi+Anh";
                        }}
                      />
                      <div className="text-xs text-zinc-300 space-y-1">
                        <p className="font-bold text-emerald-400">Ảnh QR Tùy Chỉnh Đang Hoạt Động</p>
                        <p className="text-zinc-400">Khách mua hàng sẽ quét ảnh QR này tại cửa sổ thanh toán.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* VietQR Live Preview Box */}
                {showPreviewQr && (
                  <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={settings.qr_image_url && settings.qr_image_url.trim().length > 0 
                        ? settings.qr_image_url.trim()
                        : `https://img.vietqr.io/image/${settings.bank_id}-${settings.bank_account}-compact2.png?amount=50000&addInfo=KMC9999%20Test&accountName=${encodeURIComponent(settings.bank_owner)}`}
                      alt="QR Preview"
                      className="w-40 h-auto rounded-lg border border-white/10 bg-white p-1 object-contain"
                    />
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p className="font-bold text-zinc-200 text-sm">Xem trước mã thanh toán của khách:</p>
                      <p>Kiểu hiển thị: <span className="text-emerald-400 font-bold">{settings.qr_image_url ? "Mã QR Tùy Chỉnh (Link ảnh)" : "VietQR Tự Động"}</span></p>
                      <p>Ngân hàng: <span className="text-zinc-100">{settings.bank_name} ({settings.bank_id})</span></p>
                      <p>Số tài khoản: <span className="text-amber-400 font-mono">{settings.bank_account}</span></p>
                      <p>Chủ tài khoản: <span className="text-emerald-400 font-bold">{settings.bank_owner}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: ORDERS MANAGEMENT TABLE */}
        {activeMainSection === 'orders' && (
          <div className="space-y-6">
            {/* 6 Key Statistics Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-medium text-zinc-400">Doanh Thu</span>
                  <DollarSign size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-emerald-400">{formatVND(stats.totalRevenue)}</p>
                <p className="text-[11px] text-zinc-500">Đơn hoàn thành</p>
              </div>

              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-medium text-zinc-400">Money Đã Bán</span>
                  <Coins size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-blue-400">{formatNumber(stats.totalM)} M</p>
                <p className="text-[11px] text-zinc-500">Trong server KingMC</p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 relative">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-medium text-zinc-400">Chờ Mua AH</span>
                  <Clock size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-amber-400">{stats.waitingAdmin}</p>
                <p className="text-[11px] text-amber-500/80 font-medium">Cần duyệt ngay</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-medium">Chờ Chuyển</span>
                  <Clock size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-zinc-200">{stats.pending}</p>
                <p className="text-[11px] text-zinc-500">Khách chưa chuyển</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/50 p-4 sm:p-5">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-medium text-zinc-400">Hoàn Thành</span>
                  <CheckCircle2 size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-zinc-200">{stats.completed}</p>
                <p className="text-[11px] text-zinc-500">Giao dịch thành công</p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-zinc-900/50 p-4 sm:p-5">
                <div className="flex items-center justify-between text-red-400">
                  <span className="text-xs font-medium text-zinc-400">Đã Hủy</span>
                  <XCircle size={18} />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-zinc-200">{stats.cancelled}</p>
                <p className="text-[11px] text-zinc-500">Đơn bị hủy</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] shadow-xl overflow-hidden">
              {/* Header & Filter Controls */}
              <div className="border-b border-[#1e1e2e] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Danh Sách Đơn Hàng</span>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">{filteredOrders.length}</span>
                  </h2>
                  <p className="text-xs text-zinc-400">Tự động cập nhật thời gian thực khi khách tạo đơn</p>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm mã đơn hoặc IGN..."
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="border-b border-[#1e1e2e] px-4 py-2 flex gap-2 overflow-x-auto bg-[#0e0e16]">
                {[
                  { id: 'all', label: 'Tất cả', count: stats.total },
                  { id: 'paid_waiting', label: '⚡ Chờ Mua AH', count: stats.waitingAdmin, highlight: true },
                  { id: 'pending', label: 'Chờ thanh toán', count: stats.pending },
                  { id: 'completed', label: 'Đã hoàn thành', count: stats.completed },
                  { id: 'cancelled', label: 'Đã hủy', count: stats.cancelled },
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5",
                      activeTab === tab.id 
                        ? "bg-[#1e1e2e] text-emerald-400 border border-emerald-500/30" 
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e2e]/50",
                      tab.highlight && tab.count > 0 && "text-amber-400 font-bold"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded text-[11px]",
                      tab.highlight && tab.count > 0 ? "bg-amber-500/20 text-amber-300" : "bg-black/30 text-zinc-400"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1e1e2e]/40 text-zinc-400 text-xs">
                    <tr>
                      <th className="p-4 font-semibold">Mã Đơn</th>
                      <th className="p-4 font-semibold">Thời Gian</th>
                      <th className="p-4 font-semibold">Tên Ingame (IGN)</th>
                      <th className="p-4 font-semibold">Số M Mua</th>
                      <th className="p-4 font-semibold">Tổng Tiền</th>
                      <th className="p-4 font-semibold">Trạng Thái</th>
                      <th className="p-4 font-semibold text-right">Thao Tác Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e2e]">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-[#1e1e2e]/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-emerald-400">
                          {order.id}
                        </td>
                        <td className="p-4 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-zinc-100 bg-[#0a0a0f] border border-[#1e1e2e] px-2.5 py-1 rounded-md">
                            {order.ign}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-zinc-100">
                          {formatNumber(order.money_m)} M
                        </td>
                        <td className="p-4 font-bold text-amber-400">
                          {formatVND(order.total_vnd)}
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border", getStatusColor(order.status))}>
                            {getStatusLabel(order.status)}
                          </span>
                          {order.cancel_reason && (
                             <div className="mt-1 text-[11px] text-red-400 italic">Lý do: {order.cancel_reason}</div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {(order.status === 'pending' || order.status === 'paid_waiting') ? (
                            <div className="flex items-center justify-end gap-2 relative">
                              {/* Nút Xác nhận đã mua AH */}
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'completed')} 
                                title="Admin vào game mua món đồ /ah của khách xong bấm nút này" 
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-[#0a0a0f] transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              >
                                <Check size={14} /> 
                                <span>ĐÃ MUA AH</span>
                              </button>

                              {/* Nút Hủy Đơn */}
                              <div className="relative">
                                <button 
                                  onClick={() => setCancelDropdown(cancelDropdown === order.id ? null : order.id)} 
                                  title="Hủy đơn hàng" 
                                  className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  <X size={14} /> 
                                  <span>Hủy</span>
                                </button>
                                
                                {/* Cancel Dropdown Modal */}
                                {cancelDropdown === order.id && (
                                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#1e1e2e] bg-[#12121a] p-3 shadow-2xl z-20 text-left">
                                    <p className="mb-2 text-xs font-bold text-zinc-300">Chọn lý do hủy đơn:</p>
                                    <div className="space-y-1 mb-2">
                                      {cancelReasonsList.map(r => (
                                        <button 
                                          key={r} 
                                          onClick={() => setCancelReason(r)} 
                                          className={cn(
                                            "block w-full text-left rounded-lg p-2 text-xs transition-colors", 
                                            cancelReason === r ? "bg-red-500/20 text-red-300 border border-red-500/40" : "text-zinc-400 hover:bg-[#1e1e2e]"
                                          )}
                                        >
                                          {r}
                                        </button>
                                      ))}
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder="Hoặc nhập lý do khác..." 
                                      value={cancelReason} 
                                      onChange={e => setCancelReason(e.target.value)} 
                                      className="mb-3 w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-2 text-xs text-white outline-none focus:border-red-500" 
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => setCancelDropdown(null)} 
                                        className="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                                      >
                                        Đóng
                                      </button>
                                      <button 
                                        onClick={() => updateOrderStatus(order.id, 'cancelled', cancelReason || 'Admin hủy đơn')} 
                                        className="rounded-lg bg-red-500 hover:bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-md"
                                      >
                                        Xác nhận Hủy
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500 italic">Không có thao tác</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingBag className="h-8 w-8 text-zinc-600" />
                            <p className="text-sm">Không tìm thấy đơn hàng nào phù hợp.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

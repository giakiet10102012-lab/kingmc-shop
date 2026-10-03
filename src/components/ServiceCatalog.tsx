'use client';

import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, ShoppingCart, User, AlertCircle } from 'lucide-react';
import { BaseKingService, ServicePackage } from '@/services';
import { formatVND, cn } from '@/lib/utils';
import { Order, ShopSettings, CustomPackageItem } from '@/lib/types';

interface ServiceCatalogProps {
  service: BaseKingService;
  settings: ShopSettings;
  onOrderCreated: (order: Order) => void;
}

export default function ServiceCatalog({
  service,
  settings,
  onOrderCreated,
}: ServiceCatalogProps) {
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [ign, setIgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use custom packages from settings if defined by admin, else fallback to class default
  let packages: ServicePackage[] = service.getPackages();
  if (settings.custom_catalog) {
    try {
      const allCustom: CustomPackageItem[] = JSON.parse(settings.custom_catalog);
      const serviceCustom = allCustom.filter((item) => item.serviceId === service.id);
      if (serviceCustom.length > 0) {
        packages = serviceCustom;
      }
    } catch (e) {
      console.error('Failed to parse custom_catalog', e);
    }
  }

  const handleOpenOrder = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setIgn('');
    setError(null);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    if (!ign.trim()) {
      setError('Vui lòng nhập tên nhân vật Minecraft (IGN) của bạn!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ign: `${ign.trim()} [${selectedPackage.name}]`,
          money_m: 1,
          total_vnd: selectedPackage.price,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Có lỗi xảy ra khi tạo đơn hàng.');
      }

      const newOrder: Order = await res.json();
      setSelectedPackage(null);
      onOrderCreated(newOrder);
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo đơn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Service Header Card */}
      <div className="rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-3">
          <Sparkles size={14} />
          <span>{service.badge}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          {service.headline}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
          {service.description}
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {packages.map((pkg) => {
          return (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-col justify-between rounded-3xl border p-6 transition-all",
                pkg.popular
                  ? "bg-gradient-to-b from-[#181828] to-[#10101a] border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                  : "bg-[#12121a] border-[#1e1e2e] hover:border-emerald-500/30"
              )}
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                      pkg.popular
                        ? "bg-emerald-500 text-white border-emerald-400"
                        : "bg-[#1e1e2e] text-zinc-300 border-[#2e2e42]"
                    )}
                  >
                    {pkg.badge}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-xs text-zinc-400 mb-4">{pkg.description}</p>

                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {formatVND(pkg.price)}
                  </span>
                  {pkg.originalPrice && (
                    <span className="text-xs text-zinc-500 line-through">
                      {formatVND(pkg.originalPrice)}
                    </span>
                  )}
                  {pkg.unit && (
                    <span className="text-xs text-zinc-400 font-medium">/ {pkg.unit}</span>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2 mb-6 text-xs text-zinc-300">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={11} />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Order Button */}
              <button
                type="button"
                onClick={() => handleOpenOrder(pkg)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all shadow-md",
                  pkg.popular
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-[#1e1e2e] hover:bg-emerald-500 hover:text-white text-zinc-200"
                )}
              >
                <ShoppingCart size={15} />
                <span>Đặt Mua Gói Này</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout Modal for Selected Package */}
      {selectedPackage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPackage(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 sm:p-8 shadow-2xl z-10">
            <h3 className="text-xl font-bold text-white mb-1">Xác Nhận Đặt Mua</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Dịch vụ: <span className="text-emerald-400 font-semibold">{service.name}</span>
            </p>

            {/* Selected package summary */}
            <div className="rounded-2xl bg-[#0a0a0f] p-4 border border-[#1e1e2e] mb-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{selectedPackage.name}</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {formatVND(selectedPackage.price)}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{selectedPackage.description}</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmOrder} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                  Tên nhân vật Minecraft (IGN) của bạn
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder="Nhập nick Minecraft nhận dịch vụ"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Nhập chính xác tên nhân vật trong game để shop giao dịch.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="w-1/3 rounded-xl border border-[#1e1e2e] bg-[#161622] py-2.5 text-xs font-semibold text-zinc-300 hover:bg-[#1e1e2e]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                >
                  {loading ? 'Đang tạo đơn...' : 'Tiến Hành Thanh Toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

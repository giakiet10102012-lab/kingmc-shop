"use client";

import { useState } from "react";
import { ShoppingCart, Gamepad2, Coins, AlertTriangle, Loader2, Sparkles, Check } from "lucide-react";
import { formatVND, formatNumber } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface OrderFormProps {
  settings: ShopSettings;
  onOrderCreated: (order: Order) => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

export default function OrderForm({ settings, onOrderCreated }: OrderFormProps) {
  const [ign, setIgn] = useState("");
  const [moneyM, setMoneyM] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMoney = typeof moneyM === "number" ? moneyM : 0;
  const currentRate = settings.rate_per_m || 10000;
  const totalVND = parsedMoney * currentRate;
  const isShopActive = settings.is_active !== false;
  const isValid = ign.trim().length > 0 && parsedMoney > 0 && isShopActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ign: ign.trim(), money_m: parsedMoney, total_vnd: totalVND }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Có lỗi xảy ra khi tạo đơn hàng.");
      }

      const order: Order = await res.json();
      onOrderCreated(order);
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (amount: number) => {
    setMoneyM(amount);
  };

  return (
    <div className="w-full max-w-xl mx-auto relative group">
      {/* Glow effect behind card */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      
      <form onSubmit={handleSubmit} className="relative bg-[#12121a] border border-[#1e1e2e] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        {/* Header of Form */}
        <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Đặt Mua Money Ingame</h2>
              <p className="text-xs text-zinc-400">Điền tên nhân vật và số M muốn mua</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-zinc-500 block">Tỷ giá áp dụng</span>
            <span className="text-xs font-bold text-emerald-400">{formatVND(currentRate)} / 1M</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Input 1: IGN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300">Tên Ingame (IGN)</label>
              <span className="text-xs text-amber-400/90 font-medium">Bắt buộc chính xác 100%</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Gamepad2 className="h-5 w-5 text-emerald-500" />
              </div>
              <input
                type="text"
                required
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="Nhập nick Minecraft của bạn (VD: Notch, Alex...)"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-11 pr-4 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none font-medium"
              />
            </div>
          </div>

          {/* Input 2: Số lượng M */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300">Số lượng Money muốn mua (Đơn vị: M)</label>
              <span className="text-xs text-zinc-400">Tối thiểu: 1M</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Coins className="h-5 w-5 text-amber-400" />
              </div>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={moneyM}
                onChange={(e) => setMoneyM(e.target.value ? Number(e.target.value) : "")}
                placeholder="Nhập số M cần mua (VD: 10)"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-11 pr-12 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none font-bold text-lg"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-zinc-500">
                M
              </div>
            </div>

            {/* Quick amount presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-400" /> Chọn nhanh:
              </span>
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSelectPreset(amt)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    moneyM === amt
                      ? "bg-emerald-500 text-[#0a0a0f] font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      : "border border-[#1e1e2e] bg-[#0a0a0f] text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-400"
                  }`}
                >
                  +{amt}M
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculation Summary Box */}
        <div className="bg-[#0a0a0f] rounded-2xl p-4 sm:p-5 border border-[#1e1e2e] space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Công thức tính:</span>
            <span>{parsedMoney || 0}M × {formatVND(currentRate)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#1e1e2e] pt-2">
            <div>
              <span className="text-sm font-bold text-zinc-300 block">Tổng Thanh Toán:</span>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Khách nhận đủ {parsedMoney || 0}M ingame
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatVND(totalVND)}
            </span>
          </div>
        </div>

        {/* MANDATORY WARNING BOX */}
        <div className="border-2 border-amber-500/80 bg-amber-500/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/20 p-1.5 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-amber-400 text-sm sm:text-base">LƯU Ý BẮT BUỘC TRƯỚC KHI ĐẶT ĐƠN</h3>
          </div>
          <ul className="text-xs sm:text-sm text-amber-100/90 space-y-2.5 list-none pl-1">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">1.</span>
              <span>
                Vào game KingMC dùng đúng tài khoản <strong className="text-amber-300 underline font-mono">{ign.trim() || "[Tên Ingame của bạn]"}</strong> treo đúng <strong>1 món đồ bất kỳ</strong> lên <strong className="text-emerald-400 font-mono">/ah</strong> với giá đúng bằng <strong className="text-amber-300 font-mono">{parsedMoney || "[Số M]"}M</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">2.</span>
              <span>
                <strong>Tuyệt đối KHÔNG</strong> treo thêm món đồ nào khác trong thời gian chờ duyệt để tránh Admin mua nhầm.
              </span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="text-red-400 text-xs sm:text-sm text-center font-semibold bg-red-500/10 py-2.5 px-4 rounded-xl border border-red-500/30">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#1e1e2e] disabled:text-zinc-600 text-[#0a0a0f] font-black rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] disabled:shadow-none flex items-center justify-center gap-2 text-base sm:text-lg cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              ĐANG KHỞI TẠO ĐƠN HÀNG...
            </>
          ) : !isShopActive ? (
            "SHOP HIỆN TẠI TẠM ĐÓNG"
          ) : (
            "TẠO ĐƠN VÀ THANH TOÁN"
          )}
        </button>
      </form>
    </div>
  );
}

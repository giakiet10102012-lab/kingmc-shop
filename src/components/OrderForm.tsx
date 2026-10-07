"use client";

import { useState } from "react";
import { ShoppingCart, Gamepad2, Coins, AlertTriangle, Loader2, Sparkles, Check, Lock, User, Boxes } from "lucide-react";
import { formatVND, formatNumber, cn } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface OrderFormProps {
  settings: ShopSettings;
  onOrderCreated: (order: Order) => void;
  userId?: string | null;
  onRequireAuth?: () => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

export default function OrderForm({ settings, onOrderCreated, userId, onRequireAuth }: OrderFormProps) {
  const [ign, setIgn] = useState("");
  const [moneyM, setMoneyM] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMoney = typeof moneyM === "number" ? moneyM : 0;
  const currentRate = settings.rate_per_m !== undefined ? settings.rate_per_m : 0;
  const totalVND = parsedMoney * currentRate;

  // Quản lý kho Money (Stock)
  const stock = settings.money_stock !== undefined ? settings.money_stock : 1000;
  const isOutOfStock = stock <= 0;
  const isExceedingStock = parsedMoney > stock;
  const isShopActive = settings.is_active !== false && !isOutOfStock;

  const isValid = Boolean(
    userId &&
    ign.trim().length > 0 && 
    parsedMoney > 0 && 
    isShopActive && 
    !isExceedingStock
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bắt buộc đăng nhập trước khi tạo đơn
    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (isExceedingStock) {
      setError(`Số lượng bạn đặt (${parsedMoney}M) vượt quá số Money còn lại trong kho (${stock}M)!`);
      return;
    }

    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ign: ign.trim(), 
          money_m: parsedMoney, 
          total_vnd: totalVND,
          user_id: userId
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Có lỗi xảy ra khi tạo đơn hàng.");
      }

      const order: Order = await res.json();

      // Save order id to local list for history lookup
      if (typeof window !== 'undefined') {
        try {
          const prev = JSON.parse(localStorage.getItem('kingmc_my_orders') || '[]');
          if (!prev.includes(order.id)) {
            prev.unshift(order.id);
            localStorage.setItem('kingmc_my_orders', JSON.stringify(prev.slice(0, 50)));
          }
        } catch {}
      }

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1e2e] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Đặt Mua Money Ingame</h2>
              <p className="text-xs text-zinc-400">Giao dịch tự động qua sàn đấu giá /ah</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Tỷ giá</span>
            <span className="text-sm font-black text-emerald-400">{formatVND(currentRate)} / 1M</span>
          </div>
        </div>

        {/* KHO MONEY STOCK BANNER - TO, RÕ RÀNG, DỄ NHÌN */}
        <div className={cn(
          "rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-4 transition-all shadow-md",
          isOutOfStock 
            ? "border-red-500/40 bg-red-500/10" 
            : stock < 100 
            ? "border-amber-500/40 bg-amber-500/10" 
            : "border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#161622] to-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.1)]"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border shrink-0",
              isOutOfStock 
                ? "bg-red-500/20 border-red-500/40 text-red-400" 
                : "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            )}>
              <Boxes size={22} className={isOutOfStock ? "" : "animate-pulse"} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-200 block flex items-center gap-1.5">
                <span>KHO MONEY CÒN LẠI</span>
                <span className={cn(
                  "px-2 py-0.2 rounded-full text-[10px] font-bold uppercase",
                  isOutOfStock ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                )}>
                  {isOutOfStock ? "HẾT HÀNG" : "CÒN HÀNG"}
                </span>
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400">
                {isOutOfStock ? "Shop tạm hết Money để giao dịch" : "Nguồn Money sạch 100%, sẵn sàng nạp"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className={cn(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                isOutOfStock ? "text-red-400" : "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              )}>
                {isOutOfStock ? "0" : formatNumber(stock)}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-300">M</span>
            </div>
          </div>
        </div>

        {/* Khung nhắc nhở bắt buộc Đăng nhập */}
        {!userId && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 text-xs text-zinc-200 animate-pulse">
            <div className="flex items-center gap-2">
              <User size={16} className="text-[#5865F2] shrink-0" />
              <span>Vui lòng <strong>đăng nhập tài khoản</strong> trước khi mua để bảo vệ quyền lợi và lưu lịch sử.</span>
            </div>
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shrink-0 transition-colors"
            >
              Đăng Nhập
            </button>
          </div>
        )}

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
              <span className="text-xs text-zinc-400">
                {isOutOfStock ? "Tạm hết hàng" : `Tối đa trong kho: ${formatNumber(stock)}M`}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Coins className="h-5 w-5 text-amber-400" />
              </div>
              <input
                type="number"
                required
                min="1"
                max={stock > 0 ? stock : 1}
                step="1"
                value={moneyM}
                onChange={(e) => {
                  setError(null);
                  setMoneyM(e.target.value ? Number(e.target.value) : "");
                }}
                placeholder={`Nhập số M cần mua (Tối đa: ${stock}M)`}
                className={cn(
                  "w-full bg-[#0a0a0f] border rounded-xl pl-11 pr-12 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none font-bold text-lg",
                  isExceedingStock 
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-400" 
                    : "border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                )}
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-zinc-500">
                M
              </div>
            </div>

            {/* Cảnh báo vượt quá stock */}
            {isExceedingStock && (
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1">
                <AlertTriangle size={13} />
                Số lượng đặt ({parsedMoney}M) vượt quá số Money hiện có trong kho ({stock}M)!
              </p>
            )}

            {/* Quick amount presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-400" /> Chọn nhanh:
              </span>
              {PRESET_AMOUNTS.map((amt) => {
                const disabledPreset = amt > stock;
                return (
                  <button
                    key={amt}
                    type="button"
                    disabled={disabledPreset}
                    onClick={() => handleSelectPreset(amt)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                      disabledPreset
                        ? "border border-[#1e1e2e]/50 text-zinc-600 opacity-40 cursor-not-allowed"
                        : moneyM === amt
                        ? "bg-emerald-500 text-[#0a0a0f] font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        : "border border-[#1e1e2e] bg-[#0a0a0f] text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-400"
                    )}
                  >
                    +{amt}M
                  </button>
                );
              })}
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

        {/* Nút đặt hàng: BẮT BUỘC ĐĂNG NHẬP HOẶC TẠO ĐƠN */}
        {!userId ? (
          <button
            type="button"
            onClick={onRequireAuth}
            className="w-full py-4 bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:brightness-110 text-white font-black rounded-xl transition-all shadow-[0_0_25px_rgba(88,101,242,0.4)] flex items-center justify-center gap-2 text-base sm:text-lg cursor-pointer"
          >
            <Lock size={18} />
            <span>ĐĂNG NHẬP ĐỂ MUA HÀNG</span>
          </button>
        ) : (
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
            ) : isOutOfStock ? (
              "KHO HIỆN TẠI TẠM HẾT HÀNG"
            ) : isExceedingStock ? (
              `VƯỢT QUÁ SỐ LƯỢNG KHO (${stock}M)`
            ) : !isShopActive ? (
              "SHOP HIỆN TẠI TẠM ĐÓNG"
            ) : (
              "TẠO ĐƠN VÀ THANH TOÁN"
            )}
          </button>
        )}
      </form>
    </div>
  );
}

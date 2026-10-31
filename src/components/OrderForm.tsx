"use client";

import { useState } from "react";
import { 
  ShoppingCart, 
  Gamepad2, 
  Coins, 
  AlertTriangle, 
  Loader2, 
  Sparkles, 
  Check, 
  Lock, 
  User, 
  Boxes, 
  Store, 
  Zap, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  CheckCircle2 
} from "lucide-react";
import { formatVND, formatNumber, cn } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface OrderFormProps {
  settings: ShopSettings;
  onOrderCreated: (order: Order) => void;
  userId?: string | null;
  onRequireAuth?: () => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

const CARD_TELCOS = [
  { id: 'VIETTEL', name: 'Viettel', color: 'from-red-500 to-rose-600' },
  { id: 'VINAPHONE', name: 'Vinaphone', color: 'from-blue-500 to-cyan-600' },
  { id: 'MOBIFONE', name: 'Mobifone', color: 'from-blue-600 to-indigo-600' },
  { id: 'VIETNAMOBILE', name: 'Vietnamobile', color: 'from-orange-500 to-amber-600' },
  { id: 'ZING', name: 'Thẻ Zing', color: 'from-emerald-500 to-teal-600' },
];

const CARD_AMOUNTS = [
  10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000
];

export default function OrderForm({ settings, onOrderCreated, userId, onRequireAuth }: OrderFormProps) {
  // Phương thức thanh toán: Ngân Hàng (bank) hoặc Thẻ Cào (card)
  const [paymentTab, setPaymentTab] = useState<'bank' | 'card'>('bank');

  // Thông tin chung
  const [ign, setIgn] = useState("");
  // Mặc định ưu tiên /pay theo yêu cầu
  const [deliveryMethod, setDeliveryMethod] = useState<'ah' | 'pay'>('pay');

  // Dành cho Bank Transfer
  const [moneyM, setMoneyM] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dành cho Thẻ Cào
  const [cardTelco, setCardTelco] = useState<string>('VIETTEL');
  const [cardAmount, setCardAmount] = useState<number>(50000);
  const [cardCode, setCardCode] = useState<string>('');
  const [cardSerial, setCardSerial] = useState<string>('');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const currentRate = settings.rate_per_m !== undefined && settings.rate_per_m > 0 ? settings.rate_per_m : 50;
  const parsedMoney = typeof moneyM === "number" ? moneyM : 0;
  const totalVND = parsedMoney * currentRate;

  // Tính số Money tối thiểu để đạt 5.000 VNĐ
  const minMoneyM = Math.max(1, Math.ceil(5000 / currentRate));
  const isBelowMin = parsedMoney > 0 && (totalVND < 5000 || parsedMoney < minMoneyM);

  // Quản lý kho Money (Stock)
  const stock = settings.money_stock !== undefined ? settings.money_stock : 1000;
  const isOutOfStock = stock <= 0;
  const isExceedingStock = parsedMoney > stock;
  const isShopActive = settings.is_active !== false && !isOutOfStock;

  // Tính toán quy đổi thẻ cào
  const cardDiscountPercent = settings.card_discount_percent !== undefined ? settings.card_discount_percent : 20;
  const cardRealVND = Math.floor(cardAmount * (1 - cardDiscountPercent / 100));
  const cardMoneyReceived = Math.floor(cardRealVND / currentRate);
  const isCardExceedingStock = cardMoneyReceived > stock;

  const isBankValid = Boolean(
    userId &&
    ign.trim().length > 0 && 
    parsedMoney >= minMoneyM && 
    totalVND >= 5000 &&
    isShopActive && 
    !isExceedingStock
  );

  const isCardValid = Boolean(
    userId &&
    ign.trim().length > 0 &&
    cardCode.trim().length >= 6 &&
    cardSerial.trim().length >= 6 &&
    cardAmount >= 10000 &&
    cardMoneyReceived > 0 &&
    isShopActive &&
    !isCardExceedingStock
  );

  // Xử lý tạo đơn Ngân hàng
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (totalVND < 5000 || parsedMoney < minMoneyM) {
      setError(`Hệ thống chỉ nhận giao dịch từ 5.000 VNĐ trở lên (tối thiểu ${minMoneyM}M Money).`);
      return;
    }

    if (isExceedingStock) {
      setError(`Số lượng bạn đặt (${parsedMoney}M) vượt quá số Money còn lại trong kho (${stock}M)!`);
      return;
    }

    if (!isBankValid) return;

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
          user_id: userId,
          delivery_method: deliveryMethod
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Có lỗi xảy ra khi tạo đơn hàng.");
      }

      const order: Order = await res.json();
      order.payment_method = 'bank';

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

  // Xử lý nạp thẻ cào
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!cardCode.trim() || !cardSerial.trim()) {
      setCardError("Vui lòng nhập đầy đủ Mã thẻ (PIN) và Số Seri!");
      return;
    }

    if (isCardExceedingStock) {
      setCardError(`Số lượng quy đổi (${cardMoneyReceived}M) vượt quá số Money trong kho (${stock}M)!`);
      return;
    }

    setCardLoading(true);
    setCardError(null);

    try {
      const res = await fetch("/api/card/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ign: ign.trim(),
          telco: cardTelco,
          code: cardCode.trim(),
          serial: cardSerial.trim(),
          amount: cardAmount,
          user_id: userId,
          delivery_method: deliveryMethod
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Lỗi xử lý nạp thẻ cào");
      }

      const order: Order = data.order;
      order.payment_method = 'card';
      order.card_telco = cardTelco;
      order.card_declared_value = cardAmount;
      order.card_real_value = cardRealVND;

      // Save order id to local list
      if (typeof window !== 'undefined') {
        try {
          const prev = JSON.parse(localStorage.getItem('kingmc_my_orders') || '[]');
          if (!prev.includes(order.id)) {
            prev.unshift(order.id);
            localStorage.setItem('kingmc_my_orders', JSON.stringify(prev.slice(0, 50)));
          }
        } catch {}
      }

      // Xóa form thẻ
      setCardCode('');
      setCardSerial('');

      onOrderCreated(order);
    } catch (err: any) {
      setCardError(err.message || "Lỗi khi gửi thẻ cào");
    } finally {
      setCardLoading(false);
    }
  };

  const handleSelectPreset = (amount: number) => {
    setMoneyM(amount);
  };

  return (
    <div className="w-full max-w-xl mx-auto relative group">
      {/* Glow effect behind card */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        
        {/* Header of Form */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1e2e] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Đặt Mua Money Ingame</h2>
              <p className="text-xs text-zinc-400">Giao dịch tự động qua /pay hoặc sàn /ah 24/24</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Tỷ giá</span>
            <span className="text-sm font-black text-emerald-400">{formatVND(currentRate)} / 1M</span>
          </div>
        </div>

        {/* 2 PHƯƠNG THỨC THANH TOÁN: NGÂN HÀNG & THẺ CÀO */}
        <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-[#0a0a0f] border border-[#1e1e2e]">
          <button
            type="button"
            onClick={() => setPaymentTab('bank')}
            className={cn(
              "py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
              paymentTab === 'bank'
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-[#161622]"
            )}
          >
            <Building2 size={16} />
            <span>Chuyển Khoản (VietQR)</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentTab('card')}
            className={cn(
              "py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer relative",
              paymentTab === 'card'
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-[#161622]"
            )}
          >
            <CreditCard size={16} />
            <span>Nạp Thẻ Cào</span>
            <span className="absolute -top-1.5 -right-1 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full border border-black animate-pulse">
              HOT
            </span>
          </button>
        </div>

        {/* KHO MONEY STOCK BANNER */}
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
              <span>Vui lòng <strong>đăng nhập tài khoản</strong> trước khi mua để lưu lịch sử và hỗ trợ.</span>
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

        {/* INPUT TÊN INGAME (DÙNG CHUNG CHO CẢ 2 PHƯƠNG THỨC) */}
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

        {/* PHƯƠNG THỨC NHẬN TIỀN INGAME (ƯU TIÊN /PAY LÊN ĐẦU VÀ MẶC ĐỊNH) */}
        <div className="space-y-2.5">
          <label className="text-sm font-bold text-zinc-200 flex items-center justify-between">
            <span>Chọn Hình Thức Nhận Money:</span>
            <span className="text-xs text-purple-400 font-semibold">Ưu tiên /pay tự động</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Cách 1: Chuyển /pay trực tiếp (MẶC ĐỊNH & KHUYÊN DÙNG) */}
            <button
              type="button"
              onClick={() => setDeliveryMethod('pay')}
              className={cn(
                "p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer relative",
                deliveryMethod === 'pay'
                  ? "bg-purple-500/15 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/50"
                  : "bg-[#0a0a0f] border-[#1e1e2e] hover:border-zinc-700 opacity-80 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    deliveryMethod === 'pay' ? "bg-purple-500 text-white font-bold" : "bg-[#1e1e2e] text-zinc-400"
                  )}>
                    <Zap size={16} />
                  </div>
                  <span className={cn("text-xs sm:text-sm font-extrabold", deliveryMethod === 'pay' ? "text-purple-300" : "text-zinc-200")}>
                    Pay Trực Tiếp (/pay)
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-purple-500/25 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40">
                  ⚡ Nhanh nhất
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Chỉ cần giữ nick online trong game, Bot sẽ gõ /pay chuyển thẳng tiền cho bạn!
              </p>
            </button>

            {/* Cách 2: Treo sàn /ah */}
            <button
              type="button"
              onClick={() => setDeliveryMethod('ah')}
              className={cn(
                "p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer relative",
                deliveryMethod === 'ah'
                  ? "bg-emerald-500/15 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50"
                  : "bg-[#0a0a0f] border-[#1e1e2e] hover:border-zinc-700 opacity-80 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    deliveryMethod === 'ah' ? "bg-emerald-500 text-black font-bold" : "bg-[#1e1e2e] text-zinc-400"
                  )}>
                    <Store size={16} />
                  </div>
                  <span className={cn("text-xs sm:text-sm font-extrabold", deliveryMethod === 'ah' ? "text-emerald-400" : "text-zinc-200")}>
                    Treo Sàn /ah
                  </span>
                </div>
                {deliveryMethod === 'ah' && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Treo 1 món đồ lên sàn /ah với đúng giá, Bot/Admin sẽ tìm và mua đồ của bạn.
              </p>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG TAB 1: CHUYỂN KHOẢN NGÂN HÀNG (VIETQR)                  */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {paymentTab === 'bank' && (
          <form onSubmit={handleBankSubmit} className="flex flex-col gap-5">
            {/* Input Số lượng M */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-zinc-300">Số lượng Money muốn mua (Đơn vị: M)</label>
                <span className="text-xs text-emerald-400 font-semibold">
                  Tối thiểu: {minMoneyM}M (≥ 5.000đ)
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Coins className="h-5 w-5 text-amber-400" />
                </div>
                <input
                  type="number"
                  required
                  min={minMoneyM}
                  max={stock > 0 ? stock : 1}
                  step="1"
                  value={moneyM}
                  onChange={(e) => {
                    setError(null);
                    setMoneyM(e.target.value ? Number(e.target.value) : "");
                  }}
                  placeholder={`Nhập số M cần mua (Tối thiểu: ${minMoneyM}M - Tối đa: ${stock}M)`}
                  className={cn(
                    "w-full bg-[#0a0a0f] border rounded-xl pl-11 pr-12 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none font-bold text-lg",
                    isExceedingStock || isBelowMin
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-400" 
                      : "border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  )}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-zinc-500">
                  M
                </div>
              </div>

              {/* Cảnh báo tối thiểu 5.000 VNĐ */}
              {isBelowMin && (
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1 mt-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Ngân hàng yêu cầu chuyển khoản tối thiểu <strong>5.000 VNĐ</strong> (vui lòng đặt tối thiểu <strong>{minMoneyM}M</strong>).</span>
                </p>
              )}

              {/* Cảnh báo vượt quá stock */}
              {isExceedingStock && (
                <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1 bg-red-500/10 p-2 rounded-lg border border-red-500/30">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Số lượng đặt ({parsedMoney}M) vượt quá số Money hiện có trong kho ({stock}M)!</span>
                </p>
              )}

              {/* Quick amount presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-400" /> Chọn nhanh:
                </span>
                {PRESET_AMOUNTS.filter(amt => amt >= minMoneyM || amt === minMoneyM).map((amt) => {
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
                    <Check size={12} /> Nhận đủ {parsedMoney || 0}M ingame ({deliveryMethod === 'pay' ? 'Chuyển /pay' : 'Mua /ah'})
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatVND(totalVND)}
                </span>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs sm:text-sm text-center font-semibold bg-red-500/10 py-2.5 px-4 rounded-xl border border-red-500/30">
                {error}
              </div>
            )}

            {/* Nút thanh toán */}
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
                disabled={!isBankValid || loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#1e1e2e] disabled:text-zinc-600 text-[#0a0a0f] font-black rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] disabled:shadow-none flex items-center justify-center gap-2 text-base sm:text-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ĐANG KHỞI TẠO ĐƠN HÀNG...
                  </>
                ) : isOutOfStock ? (
                  "KHO HIỆN TẠI TẠM HẾT HÀNG"
                ) : isBelowMin ? (
                  `TỐI THIỂU 5.000 VNĐ (${minMoneyM}M)`
                ) : isExceedingStock ? (
                  `VƯỢT QUÁ SỐ LƯỢNG KHO (${stock}M)`
                ) : !isShopActive ? (
                  "SHOP HIỆN TẠI TẠM ĐÓNG"
                ) : (
                  `TẠO ĐƠN & LẤY MÃ VIETQR (${formatVND(totalVND)})`
                )}
              </button>
            )}
          </form>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG TAB 2: NẠP BẰNG THẺ CÀO (GẠCH THẺ TỰ ĐỘNG)              */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {paymentTab === 'card' && (
          <form onSubmit={handleCardSubmit} className="flex flex-col gap-5">
            {/* Chọn Nhà Mạng */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                <span>Chọn Nhà Mạng:</span>
                <span className="text-xs text-amber-400">Chiết khấu: -{cardDiscountPercent}%</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CARD_TELCOS.map((telco) => (
                  <button
                    key={telco.id}
                    type="button"
                    onClick={() => setCardTelco(telco.id)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center",
                      cardTelco === telco.id
                        ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]"
                        : "bg-[#0a0a0f] border-[#1e1e2e] text-zinc-300 hover:border-zinc-600"
                    )}
                  >
                    {telco.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn Mệnh Giá */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                <span>Mệnh Giá Thẻ Cào:</span>
                <span className="text-xs text-emerald-400 font-bold">Thực nhận: {formatVND(cardRealVND)}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCardAmount(amt)}
                    className={cn(
                      "py-2 px-2 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all text-center",
                      cardAmount === amt
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-[#0a0a0f] border-[#1e1e2e] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    {formatVND(amt)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-300/80">
                ⚠️ <strong>Lưu ý:</strong> Vui lòng chọn <strong>đúng mệnh giá thẻ thật</strong>. Nếu chọn sai mệnh giá có thể bị phạt hoặc mất thẻ theo quy định của cổng gạch thẻ!
              </p>
            </div>

            {/* Nhập Mã Thẻ (PIN) & Số Seri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Mã Thẻ Cào (Mã PIN)</label>
                <input
                  type="text"
                  required
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Nhập mã số cào..."
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 outline-none uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Số Seri Thẻ</label>
                <input
                  type="text"
                  required
                  value={cardSerial}
                  onChange={(e) => setCardSerial(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Nhập số seri in trên thẻ..."
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 outline-none uppercase"
                />
              </div>
            </div>

            {/* Hộp quy đổi thẻ cào */}
            <div className="bg-[#0a0a0f] rounded-2xl p-4 sm:p-5 border border-amber-500/30 space-y-2 bg-gradient-to-b from-[#161622] to-[#0a0a0f]">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Mệnh giá nạp:</span>
                <span className="font-bold text-zinc-200">{formatVND(cardAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Chiết khấu thẻ cào:</span>
                <span className="text-rose-400 font-semibold">-{cardDiscountPercent}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Giá trị thực nhận:</span>
                <span className="font-bold text-amber-400">{formatVND(cardRealVND)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1e1e2e] pt-2">
                <div>
                  <span className="text-sm font-bold text-zinc-300 block">Số Money Quy Đổi:</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> Khách nhận {cardMoneyReceived}M ({deliveryMethod === 'pay' ? 'Chuyển /pay' : 'Mua /ah'})
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                    +{cardMoneyReceived}
                  </span>
                  <span className="text-base font-black text-amber-300">M</span>
                </div>
              </div>
            </div>

            {/* Cảnh báo vượt quá stock thẻ */}
            {isCardExceedingStock && (
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1 bg-red-500/10 p-2.5 rounded-lg border border-red-500/30">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Số Money quy đổi ({cardMoneyReceived}M) vượt quá số lượng còn trong kho ({stock}M)! Vui lòng chọn mệnh giá nhỏ hơn hoặc chờ shop nạp thêm kho.</span>
              </p>
            )}

            {cardError && (
              <div className="text-red-400 text-xs sm:text-sm text-center font-semibold bg-red-500/10 py-2.5 px-4 rounded-xl border border-red-500/30">
                {cardError}
              </div>
            )}

            {/* Nút gửi thẻ cào */}
            {!userId ? (
              <button
                type="button"
                onClick={onRequireAuth}
                className="w-full py-4 bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:brightness-110 text-white font-black rounded-xl transition-all shadow-[0_0_25px_rgba(88,101,242,0.4)] flex items-center justify-center gap-2 text-base sm:text-lg cursor-pointer"
              >
                <Lock size={18} />
                <span>ĐĂNG NHẬP ĐỂ NẠP THẺ</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isCardValid || cardLoading}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-[#1e1e2e] disabled:text-zinc-600 text-[#0a0a0f] font-black rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] disabled:shadow-none flex items-center justify-center gap-2 text-base sm:text-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {cardLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ĐANG GỬI THẺ LÊN CỔNG GẠCH...
                  </>
                ) : isOutOfStock ? (
                  "KHO HIỆN TẠI TẠM HẾT HÀNG"
                ) : isCardExceedingStock ? (
                  `VƯỢT QUÁ KHO (${stock}M)`
                ) : !isShopActive ? (
                  "SHOP HIỆN TẠI TẠM ĐÓNG"
                ) : (
                  `NẠP THẺ ${cardTelco} ${formatVND(cardAmount)} ➔ NHẬN ${cardMoneyReceived}M`
                )}
              </button>
            )}
          </form>
        )}

      </div>
    </div>
  );
}

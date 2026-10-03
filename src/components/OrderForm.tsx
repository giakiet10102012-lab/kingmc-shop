"use client";

import { useState } from "react";
import { ShoppingCart, Gamepad2, Coins, AlertTriangle, Loader2 } from "lucide-react";
import { formatVND } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface OrderFormProps {
  settings: ShopSettings;
  onOrderCreated: (order: Order) => void;
}

export default function OrderForm({ settings, onOrderCreated }: OrderFormProps) {
  const [ign, setIgn] = useState("");
  const [moneyM, setMoneyM] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMoney = typeof moneyM === "number" ? moneyM : 0;
  const totalVND = parsedMoney * (settings.rate_per_m || 0);
  const isValid = ign.trim().length > 0 && parsedMoney > 0;

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
        throw new Error("Có lỗi xảy ra khi tạo đơn hàng.");
      }

      const order: Order = await res.json();
      onOrderCreated(order);
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto relative group">
      {/* Glow effect behind card */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      
      <form onSubmit={handleSubmit} className="relative bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-[#1e1e2e] pb-4">
          <ShoppingCart className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold text-zinc-100">Mua Money Ingame</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Tên Ingame (IGN)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Gamepad2 className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="text"
                required
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="VD: Notch"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Số lượng Money (M)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Coins className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={moneyM}
                onChange={(e) => setMoneyM(e.target.value ? Number(e.target.value) : "")}
                placeholder="VD: 10"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder:text-zinc-600 transition-colors outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0f] rounded-lg p-4 border border-[#1e1e2e] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-zinc-400 font-medium">Tổng thanh toán:</span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
            {formatVND(totalVND)}
          </span>
        </div>

        {/* Warning Box */}
        <div className="border-2 border-amber-500 bg-amber-500/10 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-amber-500">LƯU Ý BẮT BUỘC TRƯỚC KHI ĐẶT ĐƠN</h3>
          </div>
          <ul className="text-sm text-amber-200/90 space-y-2 list-disc list-inside">
            <li>
              Vào game KingMC dùng đúng tài khoản <span className="font-bold text-amber-400">{ign || "[Tên Ingame]"}</span> treo đúng 1 món đồ lên /ah với giá bằng <span className="font-bold text-amber-400">{parsedMoney || "[Số M]"}M</span>.
            </li>
            <li>
              Tuyệt đối KHÔNG treo thêm món đồ nào khác trong thời gian chờ duyệt để tránh nhầm lẫn.
            </li>
          </ul>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#1e1e2e] disabled:text-zinc-500 text-[#0a0a0f] font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] disabled:shadow-none flex items-center justify-center gap-2 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              ĐANG XỬ LÝ...
            </>
          ) : (
            "TẠO ĐƠN VÀ THANH TOÁN"
          )}
        </button>
      </form>
    </div>
  );
}

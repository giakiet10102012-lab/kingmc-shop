"use client";

import { useState } from "react";
import { QrCode, Building2, Copy, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { formatVND } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface PaymentModalProps {
  order: Order;
  settings: ShopSettings;
  onClose: () => void;
}

export default function PaymentModal({ order, settings, onClose }: PaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleConfirmPaid = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "paid_waiting" }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const transferContent = `${order.id} ${order.ign}`;
  const defaultVietQr = `https://img.vietqr.io/image/${settings.bank_id}-${settings.bank_account}-compact2.png?amount=${order.total_vnd}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(settings.bank_owner)}`;
  const qrUrl = settings.qr_image_url && settings.qr_image_url.trim().length > 0 
    ? settings.qr_image_url.trim() 
    : defaultVietQr;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1e1e2e] bg-[#0a0a0f]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-zinc-100">Thanh Toán Đơn Hàng</h2>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-sm font-bold">
              {order.id}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1e1e2e] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
          
          <div className="grid grid-cols-3 gap-4 bg-[#0a0a0f] p-4 rounded-xl border border-[#1e1e2e]">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Tên Ingame</p>
              <p className="font-bold text-zinc-200">{order.ign}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Số Lượng (M)</p>
              <p className="font-bold text-zinc-200">{order.money_m}M</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Tổng Tiền</p>
              <p className="font-bold text-emerald-400">{formatVND(order.total_vnd)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: QR Code */}
            <div className="flex flex-col items-center gap-4 border border-[#1e1e2e] bg-[#0a0a0f]/50 p-6 rounded-xl">
              <div className="flex items-center gap-2 w-full justify-center pb-2 border-b border-[#1e1e2e]">
                <QrCode className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-zinc-200">Quét Mã QR</h3>
              </div>
              <div className="bg-white p-2 rounded-xl w-64 h-64 flex items-center justify-center overflow-hidden">
                <img 
                  src={qrUrl} 
                  alt="Mã QR Thanh Toán" 
                  loading="eager"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-center text-zinc-500">Mở app ngân hàng để quét mã</p>
            </div>

            {/* Right: Manual Info */}
            <div className="flex flex-col gap-4 border border-[#1e1e2e] bg-[#0a0a0f]/50 p-6 rounded-xl">
              <div className="flex items-center gap-2 w-full pb-2 border-b border-[#1e1e2e]">
                <Building2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-zinc-200">Chuyển Khoản Thủ Công</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Ngân hàng:</span>
                  <span className="font-semibold text-zinc-200">{settings.bank_name}</span>
                </div>
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">{settings.bank_account}</span>
                    <button 
                      onClick={() => handleCopy(settings.bank_account, 'stk')}
                      className="p-1.5 hover:bg-[#1e1e2e] rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedField === 'stk' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Chủ tài khoản:</span>
                  <span className="font-semibold text-zinc-200">{settings.bank_owner}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Số tiền:</span>
                  <span className="font-bold text-zinc-200">{formatVND(order.total_vnd)}</span>
                </div>

                <div className="flex justify-between items-center py-1 bg-[#1e1e2e]/50 p-2 rounded-lg mt-2 border border-[#1e1e2e]">
                  <span className="text-zinc-400">Nội dung CK:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">{transferContent}</span>
                    <button 
                      onClick={() => handleCopy(transferContent, 'nd')}
                      className="p-1.5 hover:bg-[#1e1e2e] rounded-md transition-colors text-zinc-400 hover:text-zinc-200 bg-black/20"
                    >
                      {copiedField === 'nd' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-red-500 bg-red-500/10 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <p className="text-lg font-bold text-red-400 leading-tight">
              ⚠️ CHÚ Ý QUAN TRỌNG: Nội dung chuyển khoản BẮT BUỘC phải là: <span className="bg-red-500/20 px-2 py-0.5 rounded text-red-300">{order.id} {order.ign}</span>. Nếu điền sai hoặc thiếu, Admin sẽ không thể xác nhận đơn và xử lý cho bạn!
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-[#1e1e2e] bg-[#0a0a0f] flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 font-semibold text-zinc-300 bg-[#1e1e2e] hover:bg-[#2a2a35] rounded-lg transition-colors order-2 sm:order-1"
          >
            Đóng
          </button>
          <button 
            onClick={handleConfirmPaid}
            disabled={loading || success}
            className={`px-6 py-3 font-bold rounded-lg transition-all order-1 sm:order-2 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] ${
              success 
                ? 'bg-emerald-500 text-black' 
                : 'bg-amber-500 hover:bg-amber-400 text-black hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]'
            }`}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                ĐÃ XÁC NHẬN!
              </>
            ) : (
              "Tôi Đã Chuyển Khoản ✓"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

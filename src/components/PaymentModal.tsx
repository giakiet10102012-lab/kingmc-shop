"use client";

import { useState } from "react";
import { 
  QrCode, 
  Building2, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Camera, 
  MessageSquare, 
  Store, 
  Zap, 
  Sparkles,
  ShieldAlert,
  ArrowDown
} from "lucide-react";
import { formatVND } from "@/lib/utils";
import type { ShopSettings, Order } from "@/lib/types";

interface PaymentModalProps {
  order: Order;
  settings: ShopSettings;
  onClose: () => void;
  onOpenTicket?: (order: Order) => void;
  onPaymentConfirmed?: (updatedStock?: number) => void;
}

export default function PaymentModal({ order, settings, onClose, onOpenTicket, onPaymentConfirmed }: PaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [useCustomQr, setUseCustomQr] = useState(false);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
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
        const data = await res.json().catch(() => null);
        if (onPaymentConfirmed) {
          onPaymentConfirmed(data?.current_stock);
        }
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
  
  // VietQR tự động điền sẵn số tiền & nội dung KMC-XXXX <ign>
  const vietQrUrl = `https://img.vietqr.io/image/${settings.bank_id || 'TCB'}-${settings.bank_account}-compact2.png?amount=${order.total_vnd}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(settings.bank_owner)}`;
  
  const hasCustomQr = Boolean(settings.qr_image_url && settings.qr_image_url.trim().length > 0);
  const currentQrUrl = (hasCustomQr && useCustomQr) ? settings.qr_image_url.trim() : vietQrUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1e1e2e] bg-[#0a0a0f]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">Thanh Toán Đơn Hàng</h2>
            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-md text-sm font-mono font-bold">
              {order.id}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1e1e2e] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          
          {/* Order quick overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a0a0f] p-3.5 sm:p-4 rounded-xl border border-[#1e1e2e]">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Tên Ingame</p>
              <p className="font-bold text-zinc-200 text-sm sm:text-base">{order.ign}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Số Lượng</p>
              <p className="font-bold text-zinc-200 text-sm sm:text-base">{order.money_m}M</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Tổng Tiền</p>
              <p className="font-bold text-emerald-400 text-sm sm:text-base">{formatVND(order.total_vnd)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Hình Thức Nhận</p>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${order.delivery_method === 'pay' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                {order.delivery_method === 'pay' ? '⚡ Pay Trực Tiếp' : '🏪 Treo Sàn /ah'}
              </span>
            </div>
          </div>

          {/* Delivery reminder banner */}
          <div className={`border p-3 rounded-xl flex items-center gap-3 ${order.delivery_method === 'pay' ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
            {order.delivery_method === 'pay' ? (
              <>
                <Zap className="w-5 h-5 shrink-0 text-purple-400" />
                <p className="text-xs sm:text-sm">
                  <strong>Hình thức: Chuyển /pay trực tiếp.</strong> Quý khách chỉ cần giữ nick <strong>{order.ign}</strong> online trong game KingMC để nhận tiền!
                </p>
              </>
            ) : (
              <>
                <Store className="w-5 h-5 shrink-0 text-emerald-400" />
                <p className="text-xs sm:text-sm">
                  <strong>Hình thức: Treo sàn /ah.</strong> Quý khách dùng nick <strong>{order.ign}</strong> treo đúng 1 món đồ lên sàn /ah với giá <strong>{order.money_m}M</strong> để shop mua nhé!
                </p>
              </>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* BƯỚC 1: SAO CHÉP NỘI DUNG CHUYỂN KHOẢN (ĐƯỢC ĐẶT LÊN ĐẦU TIÊN)    */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/15 via-[#18151f] to-[#12121a] p-4 sm:p-5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.15)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">1</span>
                <h3 className="font-extrabold uppercase text-amber-400 tracking-wide text-sm sm:text-base">
                  BƯỚC 1: SAO CHÉP NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                ⚠️ Bắt buộc điền đúng
              </span>
            </div>

            <div className="p-3.5 sm:p-4 bg-black/60 rounded-xl border border-amber-500/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Nội dung chuyển tiền của bạn:</p>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-wider text-amber-300 select-all">
                  {transferContent}
                </p>
              </div>
              
              <button
                onClick={() => handleCopy(transferContent, 'nd_hero')}
                className={`px-5 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg ${
                  copiedField === 'nd_hero'
                    ? 'bg-emerald-500 text-black scale-105'
                    : 'bg-amber-500 hover:bg-amber-400 text-black hover:scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                }`}
              >
                {copiedField === 'nd_hero' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    <span>✓ ĐÃ SAO CHÉP!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-black" />
                    <span>BẤM SAO CHÉP NỘI DUNG</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
              👉 <strong>LƯU Ý QUAN TRỌNG:</strong> Quý khách <strong>PHẢI DÁN ĐÚNG MÃ TRÊN</strong> vào lời nhắn khi chuyển khoản. Hệ thống tự động đọc mã đơn để cộng tiền. Nếu không điền mã đơn, hệ thống sẽ không thể nhận diện được tiền của bạn!
            </p>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* BƯỚC 2: THANH TOÁN (VIETQR TỰ ĐIỀN HOẶC CHUYỂN THỦ CÔNG)         */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">2</span>
              <h3 className="font-extrabold uppercase text-blue-400 tracking-wide text-sm sm:text-base">
                BƯỚC 2: THANH TOÁN TIỀN
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Column: QR Code Section */}
              <div className="flex flex-col items-center gap-3.5 border border-[#1e1e2e] bg-[#0a0a0f] p-4 sm:p-5 rounded-xl">
                <div className="flex items-center justify-between w-full pb-2 border-b border-[#1e1e2e]">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-zinc-200 text-sm">Quét Mã QR</h4>
                  </div>

                  {hasCustomQr && (
                    <button
                      onClick={() => setUseCustomQr(!useCustomQr)}
                      className="text-[11px] font-semibold px-2 py-1 rounded bg-[#1e1e2e] text-zinc-300 hover:text-white border border-[#2a2a3a]"
                    >
                      {useCustomQr ? "⚡ Chuyển sang VietQR tự điền" : "🖼️ Xem QR gốc của shop"}
                    </button>
                  )}
                </div>

                {!useCustomQr && (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg text-center">
                    <p className="text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>VietQR tự động điền sẵn <strong>{formatVND(order.total_vnd)}</strong> & nội dung <strong>{transferContent}</strong></span>
                    </p>
                  </div>
                )}

                {/* QR Code Frame */}
                <div className="bg-white p-3 rounded-2xl w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center overflow-hidden shadow-xl border-4 border-white">
                  <img 
                    src={currentQrUrl} 
                    alt="Mã QR Thanh Toán" 
                    loading="eager"
                    className="w-full h-full object-contain"
                  />
                </div>

                <p className="text-xs text-center text-zinc-400">
                  Mở app ngân hàng (Techcombank, MB, Momo, BIDV...) quét mã để thanh toán
                </p>

                <div className="w-full bg-[#181824] border border-amber-500/30 p-2.5 rounded-xl text-left space-y-1 shadow-sm">
                  <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <span>💡 Lưu ý đối với app Techcombank:</span>
                  </p>
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Do chính sách bảo mật riêng của Techcombank, app sẽ để trống ô Số tiền & Nội dung. Quý khách chỉ cần nhập số tiền <strong>{formatVND(order.total_vnd)}</strong> và dán <strong>Nội dung đã sao chép ở Bước 1</strong> vào là xong!
                  </p>
                </div>
              </div>

              {/* Right Column: Manual Transfer Info */}
              <div className="flex flex-col justify-between border border-[#1e1e2e] bg-[#0a0a0f] p-4 sm:p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1e1e2e]">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-zinc-200 text-sm">Chuyển Khoản Thủ Công</h4>
                </div>
                
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {/* Bank Name */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-400">Ngân hàng:</span>
                    <span className="font-bold text-zinc-200">{settings.bank_name}</span>
                  </div>
                  
                  {/* Account Number */}
                  <div className="flex justify-between items-center py-1 bg-[#12121a] p-2 rounded-lg border border-[#1e1e2e]">
                    <span className="text-zinc-400">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">{settings.bank_account}</span>
                      <button 
                        onClick={() => handleCopy(settings.bank_account, 'stk')}
                        className="px-2 py-1 bg-[#1e1e2e] hover:bg-[#2a2a35] rounded text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                        title="Sao chép STK"
                      >
                        {copiedField === 'stk' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'stk' ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-400">Chủ tài khoản:</span>
                    <span className="font-bold text-zinc-200 uppercase">{settings.bank_owner}</span>
                  </div>

                  {/* Amount */}
                  <div className="flex justify-between items-center py-1 bg-[#12121a] p-2 rounded-lg border border-[#1e1e2e]">
                    <span className="text-zinc-400">Số tiền chuyển:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 text-sm sm:text-base">{formatVND(order.total_vnd)}</span>
                      <button 
                        onClick={() => handleCopy(String(order.total_vnd), 'amount')}
                        className="px-2 py-1 bg-[#1e1e2e] hover:bg-[#2a2a35] rounded text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                        title="Sao chép số tiền"
                      >
                        {copiedField === 'amount' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'amount' ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Transfer Note reminder */}
                  <div className="flex justify-between items-center py-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                    <span className="text-amber-400 font-semibold">Nội dung CK:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 text-sm sm:text-base">{transferContent}</span>
                      <button 
                        onClick={() => handleCopy(transferContent, 'nd_row')}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded text-xs font-bold text-amber-300 transition-colors flex items-center gap-1"
                        title="Sao chép nội dung"
                      >
                        {copiedField === 'nd_row' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'nd_row' ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-zinc-500 flex items-center gap-1">
                  <span>💡 Bạn có thể bấm nút [Chép] ở từng dòng để dán nhanh vào app ngân hàng.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* LƯU Ý BẮT BUỘC CHỤP MÀN HÌNH GIAO DỊCH                           */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="border border-amber-500/60 bg-gradient-to-r from-amber-500/10 via-[#1a1820] to-[#12121a] p-3.5 sm:p-4 rounded-xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-extrabold uppercase text-amber-400 tracking-wide">
                📸 BẮT BUỘC CHỤP LẠI MÀN HÌNH CHUYỂN KHOẢN THÀNH CÔNG:
              </p>
              <p className="text-zinc-300 leading-relaxed text-xs">
                Sau khi chuyển tiền, <strong>quý khách vui lòng CHỤP LẠI MÀN HÌNH giao dịch chuyển khoản thành công</strong>. Trong trường hợp ngân hàng bị nghẽn mạng, delay hoặc bạn ghi nhầm nội dung, chỉ cần gửi ảnh chụp thanh toán vào Ticket là Admin sẽ hỗ trợ giải quyết ngay!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1e1e2e] bg-[#0a0a0f] flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Ticket Support Button */}
          {onOpenTicket && (
            <button
              onClick={() => onOpenTicket(order)}
              className="w-full sm:w-auto px-4 py-2.5 font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:scale-[1.02]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Mở Ticket Nhắn Cho Admin</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto justify-end">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 font-semibold text-zinc-300 bg-[#1e1e2e] hover:bg-[#2a2a35] rounded-lg transition-colors order-2 sm:order-1 text-center text-sm"
            >
              Đóng
            </button>
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={loading || success}
              className={`px-6 py-2.5 font-bold rounded-lg transition-all order-1 sm:order-2 flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(245,158,11,0.2)] ${
                success 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-amber-500 hover:bg-amber-400 text-black hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]'
              }`}
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  ĐÃ XÁC NHẬN THANH TOÁN!
                </>
              ) : (
                "Xác Nhận Đã Thanh Toán ✓"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* POPUP BẢO VỆ CHỐNG BẤM NHẦM (CONFIRMATION GUARD)                  */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#161622] border-2 border-amber-500/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Kiểm Tra Lại Lời Nhắn</h3>
                <p className="text-xs text-zinc-400">Đơn hàng #{order.id}</p>
              </div>
            </div>

            <div className="p-3.5 bg-black/50 rounded-xl border border-zinc-800 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Số tiền cần chuyển:</span>
                <span className="font-bold text-emerald-400 text-base">{formatVND(order.total_vnd)}</span>
              </div>
              <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Nội dung chuyển khoản bắt buộc:</span>
                <span className="font-mono font-black text-amber-300 text-base bg-amber-500/15 p-2 rounded border border-amber-500/30 text-center select-all">
                  {transferContent}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Bạn đã chuyển đúng số tiền <strong>{formatVND(order.total_vnd)}</strong> và điền đúng nội dung <strong>{transferContent}</strong> vào app ngân hàng chưa?
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#222232] hover:bg-[#2c2c40] text-zinc-300 text-xs sm:text-sm font-semibold transition-colors"
              >
                ✕ Kiểm Tra Lại
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleConfirmPaid();
                }}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                {loading ? "Đang xử lý..." : "✓ Tôi Đã Chuyển Đúng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

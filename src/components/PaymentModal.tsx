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
  Download,
  CreditCard,
  Clock
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
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [useCustomQr, setUseCustomQr] = useState(false);

  const isCard = order.payment_method === 'card';

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
  const transferNoteForQr = `${order.id.replace(/-/g, '')} ${order.ign}`.trim();
  
  // VietQR dạng chỉ lấy mã QR thuần túy (qr_only) phóng to cực đại, không khung chữ rườm rà
  const vietQrUrl = `https://img.vietqr.io/image/${settings.bank_id || 'TCB'}-${settings.bank_account}-qr_only.png?amount=${order.total_vnd}&addInfo=${encodeURIComponent(transferNoteForQr)}&accountName=${encodeURIComponent(settings.bank_owner)}`;
  
  const hasCustomQr = Boolean(settings.qr_image_url && settings.qr_image_url.trim().length > 0);
  const currentQrUrl = (hasCustomQr && useCustomQr && settings.qr_image_url) ? settings.qr_image_url.trim() : vietQrUrl;

  // Xử lý tải ảnh QR về điện thoại / máy tính
  const handleDownloadQr = async () => {
    setDownloading(true);
    try {
      const res = await fetch(currentQrUrl);
      const text = await res.text();
      let downloadUrl = currentQrUrl;

      // Nếu là SVG chứa ảnh PNG base64 bên trong
      const base64Index = text.indexOf('data:image/png;base64,');
      if (base64Index !== -1) {
        const endIndex = text.indexOf('"', base64Index);
        downloadUrl = text.substring(base64Index, endIndex);
      } else {
        const blob = new Blob([text], { type: 'image/svg+xml' });
        downloadUrl = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `VietQR_${order.id}_${order.total_vnd}d.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.warn('Direct download failed, opening in new tab:', err);
      window.open(currentQrUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1e1e2e] bg-[#0a0a0f]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
              {isCard ? "Đơn Nạp Thẻ Cào Ingame" : "Thanh Toán Đơn Hàng"}
            </h2>
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
              <p className="font-bold text-zinc-200 text-sm sm:text-base">+{order.money_m}M</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{isCard ? "Thực Nhận" : "Tổng Tiền"}</p>
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
                  <strong>Hình thức: Chuyển /pay trực tiếp.</strong> Quý khách chỉ cần giữ nick <strong>{order.ign}</strong> ONLINE trong game KingMC để bot chuyển tiền thẳng vào ví!
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
          {/* NẾU LÀ ĐƠN NẠP THẺ CÀO (GẠCH THẺ TỰ ĐỘNG)                        */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {isCard ? (
            <div className="border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/15 via-[#161622] to-[#0a0a0f] p-5 sm:p-6 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.15)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold uppercase text-amber-400 tracking-wide text-base sm:text-lg">
                    ĐÃ TIẾP NHẬN THẺ CÀO #{order.id}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Hệ thống đang gửi thẻ sang cổng gạch thẻ tự động
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/60 p-4 rounded-xl border border-amber-500/30 text-xs sm:text-sm">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Nhà mạng:</span>
                  <span className="font-bold text-white text-sm">{order.card_telco || 'Thẻ Cào'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Mệnh giá nạp:</span>
                  <span className="font-bold text-amber-300 text-sm">{formatVND(order.card_declared_value || order.total_vnd)}</span>
                </div>
                <div>
                  {(() => {
                    const discount = order.card_declared_value && order.card_real_value 
                      ? Math.round((1 - order.card_real_value / order.card_declared_value) * 100) 
                      : 15;
                    return <span className="text-zinc-500 block mb-0.5">Thực nhận (-{discount}%):</span>;
                  })()}
                  <span className="font-bold text-emerald-400 text-sm">{formatVND(order.card_real_value || order.total_vnd)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Money Ingame:</span>
                  <span className="font-black text-amber-300 text-base">+{order.money_m}M</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                <Clock className="w-4 h-4 shrink-0 text-blue-400 animate-spin" />
                <span>
                  Quá trình kiểm tra và gạch thẻ thường diễn ra từ <strong>10 giây đến 1 phút</strong>. Ngay khi thẻ được duyệt đúng, hệ thống/bot sẽ tự động giao <strong>{order.money_m}M Money</strong> cho bạn!
                </span>
              </div>
            </div>
          ) : (
            /* ═════════════════════════════════════════════════════════════════ */
            /* NẾU LÀ ĐƠN NGÂN HÀNG: VIETQR LÊN ĐẦU TIÊN                        */
            /* ═════════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-black text-xs font-black flex items-center justify-center">1</span>
                  <h3 className="font-extrabold uppercase text-emerald-400 tracking-wide text-sm sm:text-base">
                    BƯỚC 1: QUÉT MÃ VIETQR HOẶC TẢI ẢNH QR VỀ MÁY
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Left Column: QR Code Section (Phóng to cực đại + Nút tải ảnh) */}
                  <div className="flex flex-col items-center gap-3.5 border border-[#1e1e2e] bg-[#0a0a0f] p-4 sm:p-5 rounded-xl">
                    <div className="flex items-center justify-between w-full pb-2 border-b border-[#1e1e2e]">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-zinc-200 text-sm">Mã VietQR Tự Động</h4>
                      </div>

                      {hasCustomQr && (
                        <button
                          onClick={() => setUseCustomQr(!useCustomQr)}
                          className="text-[11px] font-semibold px-2 py-1 rounded bg-[#1e1e2e] text-zinc-300 hover:text-white border border-[#2a2a3a]"
                        >
                          {useCustomQr ? "⚡ Dùng VietQR tự điền" : "🖼️ Xem QR gốc"}
                        </button>
                      )}
                    </div>

                    {!useCustomQr && (
                      <div className="w-full bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-center">
                        <p className="text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span>Đã điền sẵn <strong>{formatVND(order.total_vnd)}</strong> & nội dung <strong>{transferNoteForQr}</strong></span>
                        </p>
                      </div>
                    )}

                    {/* Khung mã QR phóng to cực đại - Chỉ lấy mã QR thuần túy (qr_only) */}
                    <div className="bg-white p-3.5 rounded-2xl w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-emerald-500/30">
                      <img 
                        src={currentQrUrl} 
                        alt="Mã QR Thanh Toán" 
                        loading="eager"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* NÚT TẢI ẢNH QR VỀ MÁY CHO ĐIỆN THOẠI */}
                    <button
                      onClick={handleDownloadQr}
                      disabled={downloading}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        downloadSuccess
                          ? 'bg-emerald-500 text-black'
                          : 'bg-[#1e1e2e] hover:bg-emerald-500 hover:text-black text-zinc-200 border border-[#2a2a3a]'
                      }`}
                    >
                      {downloadSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-black" />
                          <span>✓ ĐÃ TẢI ẢNH QR VỀ MÁY!</span>
                        </>
                      ) : downloading ? (
                        <span>Đang tải xuống...</span>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Tải Ảnh Mã QR Về Máy (Mở app ngân hàng quét ảnh)</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-zinc-500 text-center">
                      📱 Mở app ngân hàng bất kỳ (Techcombank, MB, VCB...) ➔ Chọn <strong>Quét QR</strong> ➔ Quét mã trên để chuyển tiền tự động.
                    </p>
                  </div>

                  {/* Right Column: Manual Transfer Info (Dự phòng) */}
                  <div className="flex flex-col justify-between border border-[#1e1e2e] bg-[#0a0a0f] p-4 sm:p-5 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#1e1e2e]">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-zinc-200 text-sm">Chuyển Khoản Thủ Công (Dự Phòng)</h4>
                    </div>
                    
                    <div className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#12121a]">
                        <span className="text-zinc-400">Ngân hàng:</span>
                        <span className="font-semibold text-zinc-200">{settings.bank_name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#12121a]">
                        <span className="text-zinc-400">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">{settings.bank_account}</span>
                          <button
                            onClick={() => handleCopy(settings.bank_account, 'account')}
                            className="text-xs px-2 py-0.5 rounded bg-[#1e1e2e] hover:bg-[#2a2a3a] text-zinc-300 font-semibold"
                          >
                            {copiedField === 'account' ? '✓ Đã chép' : 'Chép'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#12121a]">
                        <span className="text-zinc-400">Chủ tài khoản:</span>
                        <span className="font-semibold text-zinc-200">{settings.bank_owner}</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#12121a]">
                        <span className="text-zinc-400">Số tiền:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">{formatVND(order.total_vnd)}</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div>
                          <span className="text-zinc-400 text-xs block">Nội dung CK:</span>
                          <span className="font-mono font-black text-amber-300 text-sm sm:text-base select-all">
                            {transferContent}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(transferContent, 'nd_manual')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            copiedField === 'nd_manual'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-amber-500 hover:bg-amber-400 text-black'
                          }`}
                        >
                          {copiedField === 'nd_manual' ? '✓ Đã chép' : 'Chép ND'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                      <p className="text-[11px] font-bold text-amber-300">
                        ⚠️ Nếu chuyển khoản thủ công:
                      </p>
                      <p className="text-[11px] text-zinc-300 leading-tight">
                        Vui lòng bấm nút <strong>Chép ND</strong> và dán đúng <strong>{transferContent}</strong> vào lời nhắn chuyển tiền để hệ thống tự động cộng tiền cho bạn!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BẮT BUỘC CHỤP LẠI MÀN HÌNH CHUYỂN KHOẢN */}
              <div className="border border-amber-500/30 bg-amber-500/10 p-4 rounded-xl flex items-start gap-3">
                <Camera className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
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
          )}

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
            
            {!isCard && (
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
            )}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* POPUP BẢO VỆ CHỐNG BẤM NHẦM (CONFIRMATION GUARD CHO BANK)         */}
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

export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KMC-${num}`;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Chờ thanh toán';
    case 'paid_waiting': return 'Chờ Admin duyệt';
    case 'completed': return 'Hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'paid_waiting': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
  }
}

export function buildVietQRUrl(params: {
  bankId: string;
  accountNo: string;
  amount: number;
  addInfo: string;
  accountName: string;
}): string {
  const { bankId, accountNo, amount, addInfo, accountName } = params;
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
}

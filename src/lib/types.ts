export interface Order {
  id: string;
  ign: string;
  money_m: number;
  total_vnd: number;
  status: 'pending' | 'paid_waiting' | 'completed' | 'cancelled';
  user_id?: string | null;
  created_at: string;
  hidden_from_admin?: boolean;
  delivery_method?: 'ah' | 'pay';
  payment_method?: 'bank' | 'card';
  card_telco?: string;
  card_code?: string;
  card_serial?: string;
  card_declared_value?: number;
  card_real_value?: number;
  cancel_reason?: string | null;
}

export interface AppConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  username: string;
  created_at: string;
}

export interface ShopSettings {
  rate_per_m: number;
  bank_name: string;
  bank_id: string;
  bank_account: string;
  bank_owner: string;
  shop_notice?: string;
  is_active?: boolean;
  qr_image_url?: string; // Link ảnh QR tùy chỉnh của shop
  custom_catalog?: string; // JSON string chứa danh mục các gói bán do admin tùy chỉnh
  money_stock?: number; // Số lượng Money (M) còn trong kho của shop
  discord_webhook_url?: string; // Webhook Discord của Admin để nhận log biến động số dư và thông báo đơn mới
  card_partner_id?: string; // Partner ID cổng đổi thẻ cào (TheSieuRe/Doithe1s)
  card_partner_key?: string; // Partner Key cổng đổi thẻ cào
  card_discount_percent?: number; // Chiết khấu nạp thẻ cào (ví dụ 20%)
  card_gateway_url?: string; // Endpoint API gạch thẻ (mặc định https://thesieure.com/chargingws/v2)
}

export interface OrderMessage {
  id: number | string;
  order_id: string;
  sender: 'customer' | 'admin';
  sender_name?: string;
  message: string;
  created_at: string;
}

export interface BankLog {
  id: string;
  timestamp: string;
  amount: number;
  content: string;
  order_id?: string | null;
  status: 'matched' | 'unmatched' | 'underpaid';
  raw_payload?: string;
  gateway?: string;
  note?: string;
}

export interface CardLog {
  id: string;
  timestamp: string;
  order_id: string;
  ign: string;
  telco: string;
  code: string;
  serial: string;
  declared_value: number;
  real_value?: number;
  status: 'pending' | 'success' | 'invalid' | 'wrong_amount';
  message?: string;
}

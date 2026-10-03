export type OrderStatus = 'pending' | 'paid_waiting' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  user_id: string | null;
  ign: string;
  money_m: number;
  total_vnd: number;
  status: OrderStatus;
  cancel_reason: string | null;
  created_at: string;
}

export interface AppConfig {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface CustomPackageItem {
  id: string;
  serviceId: string; // 'money' | 'rank' | 'items' | 'boosting' | 'topup'
  name: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  description: string;
  features: string[];
  unit?: string;
  popular?: boolean;
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
}

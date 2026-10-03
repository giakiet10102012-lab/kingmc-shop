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

export interface ShopSettings {
  rate_per_m: number;
  bank_name: string;
  bank_id: string;
  bank_account: string;
  bank_owner: string;
}

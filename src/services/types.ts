export type ServiceId = 'money' | 'rank' | 'items' | 'boosting' | 'topup';

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  description: string;
  features: string[];
  unit?: string;
  popular?: boolean;
}

export interface IKingService {
  id: ServiceId;
  name: string;
  shortTitle: string;
  iconName: string;
  badge: string;
  headline: string;
  description: string;
  isActive: boolean;
  comingSoon?: boolean;
  getPackages(): ServicePackage[];
}

import { IKingService, ServiceId, ServicePackage } from './types';

export abstract class BaseKingService implements IKingService {
  abstract id: ServiceId;
  abstract name: string;
  abstract shortTitle: string;
  abstract iconName: string;
  abstract badge: string;
  abstract headline: string;
  abstract description: string;
  isActive: boolean = true;
  comingSoon?: boolean = false;

  abstract getPackages(): ServicePackage[];

  public formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }
}

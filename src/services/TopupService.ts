import { BaseKingService } from './BaseKingService';
import { ServiceId, ServicePackage } from './types';

export class TopupService extends BaseKingService {
  id: ServiceId = 'topup';
  name = 'Nạp Thẻ Cào & Đổi Thẻ KingMC';
  shortTitle = 'Nạp Thẻ Cào';
  iconName = 'CreditCard';
  badge = 'Tự Động 24/7';
  headline = 'Đổi Thẻ Cào Điện Thoại Sang Tiền /ah KingMC';
  description = 'Hỗ trợ nạp qua thẻ Viettel, VinaPhone, MobiFone, Zing với chiết khấu tốt nhất. Tiền sẽ được quy đổi sang Money KingMC tự động.';
  isActive = true;

  getPackages(): ServicePackage[] {
    return [
      {
        id: 'card_20k',
        name: 'Thẻ Cào 20.000đ',
        price: 20000,
        unit: '20K Thẻ',
        description: 'Đổi nhận 1.8M Money KingMC',
        features: ['Nhận ngay 1.8M Money trong game', 'Hỗ trợ Viettel / Vina / Mobi', 'Xử lý tự động']
      },
      {
        id: 'card_50k',
        name: 'Thẻ Cào 50.000đ',
        price: 50000,
        unit: '50K Thẻ',
        popular: true,
        badge: 'Ưu Đãi',
        description: 'Đổi nhận 4.8M Money KingMC',
        features: ['Nhận ngay 4.8M Money trong game', 'Tặng thêm 200k money khuyến mãi', 'Duyệt trong 30 giây']
      },
      {
        id: 'card_100k',
        name: 'Thẻ Cào 100.000đ',
        price: 100000,
        unit: '100K Thẻ',
        badge: 'Tặng Thêm 10%',
        description: 'Đổi nhận 10M Money KingMC',
        features: ['Nhận đủ 10M Money trong game', 'Tặng code quà tặng tân thủ', 'Ưu tiên duyệt 24/7']
      },
      {
        id: 'card_200k',
        name: 'Thẻ Cào 200.000đ',
        price: 200000,
        unit: '200K Thẻ',
        badge: 'VIP Nạp',
        description: 'Đổi nhận 21M Money KingMC',
        features: ['Nhận ngay 21M Money trong game', 'Tặng thẻ VIP dùng thử 3 ngày']
      }
    ];
  }
}

import { BaseKingService } from './BaseKingService';
import { ServiceId, ServicePackage } from './types';

export class MoneyService extends BaseKingService {
  id: ServiceId = 'money';
  name = 'Mua Bán Money KingMC';
  shortTitle = 'Money Ingame';
  iconName = 'Coins';
  badge = 'HOT • Tự Động';
  headline = 'Mua Bán Money KingMC Tự Động';
  description = 'Giao dịch qua sàn /ah ingame 100% tự động. Bạn treo đồ theo giá chỉ định và nhận đủ 100% tiền, shop chịu toàn bộ thuế sàn.';
  isActive = true;

  getPackages(): ServicePackage[] {
    return [
      {
        id: 'money_5m',
        name: 'Gói 5M Money',
        price: 50000,
        unit: '5M',
        description: 'Phù hợp cho tân thủ khởi đầu sever KingMC',
        features: ['Nhận đủ 5.000.000$ ingame', '0% thuế sàn /ah', 'Admin duyệt mua trong 1-3 phút']
      },
      {
        id: 'money_10m',
        name: 'Gói 10M Money',
        price: 100000,
        unit: '10M',
        badge: 'Phổ Biến',
        popular: true,
        description: 'Gói được nhiều game thủ lựa chọn nhất',
        features: ['Nhận đủ 10.000.000$ ingame', '0% thuế sàn /ah', 'Duyệt siêu tốc', 'Ưu tiên hỗ trợ']
      },
      {
        id: 'money_20m',
        name: 'Gói 20M Money',
        price: 200000,
        unit: '20M',
        description: 'Tài chính vững vàng để build đồ & faction',
        features: ['Nhận đủ 20.000.000$ ingame', '0% thuế sàn /ah', 'Duyệt siêu tốc']
      },
      {
        id: 'money_50m',
        name: 'Gói 50M Money',
        price: 500000,
        unit: '50M',
        badge: 'VIP Deal',
        description: 'Đại gia server, thoải mái sắm đồ cực phẩm',
        features: ['Nhận đủ 50.000.000$ ingame', '0% thuế sàn /ah', 'Ưu tiên duyệt tức thì']
      },
      {
        id: 'money_100m',
        name: 'Gói 100M Money',
        price: 1000000,
        unit: '100M',
        badge: 'Trùm Server',
        description: 'Thống trị kinh tế KingMC',
        features: ['Nhận đủ 100.000.000$ ingame', '0% thuế sàn /ah', 'Tặng role Discord riêng']
      }
    ];
  }
}

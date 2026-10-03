import { BaseKingService } from './BaseKingService';
import { ServiceId, ServicePackage } from './types';

export class RankService extends BaseKingService {
  id: ServiceId = 'rank';
  name = 'Nâng Cấp Rank & VIP KingMC';
  shortTitle = 'Rank & VIP';
  iconName = 'Crown';
  badge = 'Đặc Quyền';
  headline = 'Nâng Cấp Rank VIP Server KingMC';
  description = 'Sở hữu ngay các Rank VIP với các đặc quyền độc quyền: lệnh /fly, bộ Kit đặc biệt mỗi ngày, tag chat VIP và giới hạn /sethome vượt trội.';
  isActive = true;

  getPackages(): ServicePackage[] {
    return [
      {
        id: 'rank_vip',
        name: 'Rank [VIP]',
        price: 50000,
        originalPrice: 70000,
        badge: 'Tân Thủ',
        description: 'Bắt đầu trải nghiệm các đặc quyền cơ bản của KingMC',
        features: [
          'Lệnh bay /fly tại khu vực sảnh',
          'Kit VIP nhận hàng ngày (Giáp sắt & tools enchant)',
          'Tối đa 3 điểm /sethome',
          'Prefix [VIP] màu xanh lá nổi bật trên chat',
          'Vào server ngay cả khi server đầy'
        ]
      },
      {
        id: 'rank_vip_pro',
        name: 'Rank [VIP+]',
        price: 100000,
        originalPrice: 150000,
        badge: 'Bán Chạy',
        popular: true,
        description: 'Gói rank tối ưu chi phí và nhiều tính năng vượt trội',
        features: [
          'Lệnh /fly mọi world (trừ khu vực PvP)',
          'Kit VIP+ hàng ngày (Giáp kim cương Protection IV)',
          'Tối đa 5 điểm /sethome',
          'Lệnh /feed và /heal hồi phục tức thì',
          'Prefix [VIP+] xanh dương lấp lánh',
          'Tăng x1.5 kinh nghiệm khi train'
        ]
      },
      {
        id: 'rank_mvp',
        name: 'Rank [MVP]',
        price: 250000,
        originalPrice: 350000,
        badge: 'Cao Cấp',
        description: 'Dành cho các chiến binh thực thụ muốn dẫn đầu',
        features: [
          'Full lệnh bay /fly không giới hạn',
          'Bộ Kit MVP Netherite cực mạnh mỗi 3 ngày',
          'Tối đa 10 điểm /sethome',
          'Lệnh /craft và /enderchest di động',
          'Hiệu ứng hạt Wings & Trail tùy chỉnh',
          'Prefix [MVP] màu tím huyền bí'
        ]
      },
      {
        id: 'rank_king',
        name: 'Rank [KING]',
        price: 500000,
        originalPrice: 800000,
        badge: 'Tối Thượng',
        description: 'Vua của Server KingMC - Quyền năng cao nhất',
        features: [
          'Toàn bộ quyền hạn của VIP, VIP+, MVP',
          'Bộ Kit KING Hoàng Gia độc quyền (Full Netherite Max Enchant)',
          'Không giới hạn số điểm /sethome',
          'Lệnh đổi màu tên chat & phát thông báo server /broadcast cá nhân',
          'Role VIP King độc quyền trên Discord Server',
          'Hỗ trợ 1-1 riêng biệt từ Admin'
        ]
      }
    ];
  }
}

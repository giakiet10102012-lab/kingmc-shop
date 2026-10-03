import { BaseKingService } from './BaseKingService';
import { ServiceId, ServicePackage } from './types';

export class BoostingService extends BaseKingService {
  id: ServiceId = 'boosting';
  name = 'Dịch Vụ Cày Thuê KingMC';
  shortTitle = 'Cày Thuê & Nhiệm Vụ';
  iconName = 'Zap';
  badge = 'Bảo Mật 100%';
  headline = 'Dịch Vụ Cày Thuê Minecraft KingMC';
  description = 'Bạn không có thời gian cày cuốc? Đội ngũ KingMC Shop nhận cày level, cày McMMO, farm quặng kim cương, cày BattlePass trọn gói nhanh chóng, uy tín và an toàn tuyệt đối.';
  isActive = true;

  getPackages(): ServicePackage[] {
    return [
      {
        id: 'boost_mcmmo_1k',
        name: 'Gói Cày 1.000 Level McMMO',
        price: 80000,
        badge: 'Nhanh 24h',
        popular: true,
        description: 'Tăng sức mạnh kỹ năng Mining, Swords, Acrobatics',
        features: [
          'Tăng ngay 1.000 level kỹ năng McMMO tùy chọn',
          'Hoàn thành trong vòng 12-24 giờ',
          'Tặng toàn bộ vật phẩm rớt ra trong lúc train'
        ]
      },
      {
        id: 'boost_ore_chest',
        name: 'Farm 1 Rương Đôi Quặng Kim Cương & Netherite',
        price: 130000,
        badge: 'Full Rương',
        description: 'Kho báu tài nguyên không tốn công đào',
        features: [
          '54 stack (3.456 viên) Quặng Kim Cương',
          '16 Phôi Netherite nguyên chất',
          'Giao tận rương tại căn cứ của bạn'
        ]
      },
      {
        id: 'boost_battlepass_season',
        name: 'Cày Full Cấp Mùa BattlePass',
        price: 160000,
        originalPrice: 220000,
        badge: 'Trọn Gói Mùa',
        description: 'Nhận toàn bộ phần thưởng mốc cao nhất của mùa giải',
        features: [
          'Hoàn thành 100% nhiệm vụ tuần và mùa',
          'Mở khóa toàn bộ rương báu & danh hiệu mùa',
          'Bảo mật tài khoản tuyệt đối, cam kết không vi phạm luật server'
        ]
      }
    ];
  }
}

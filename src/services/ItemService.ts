import { BaseKingService } from './BaseKingService';
import { ServiceId, ServicePackage } from './types';

export class ItemService extends BaseKingService {
  id: ServiceId = 'items';
  name = 'Vũ Khí & Vật Phẩm Hiếm KingMC';
  shortTitle = 'Vũ Khí & Đồ VIP';
  iconName = 'Sword';
  badge = 'Cực Phẩm';
  headline = 'Kho Vũ Khí & Trang Bị Custom KingMC';
  description = 'Sở hữu ngay các set trang bị Netherite custom, kiếm Thần Long với chỉ số enchant cực khủng, cúp đào tài nguyên siêu tốc không thể tìm thấy trong game thông thường.';
  isActive = true;

  getPackages(): ServicePackage[] {
    return [
      {
        id: 'item_sword_god',
        name: 'Kiếm Thần Long (God Sword)',
        price: 120000,
        badge: 'Siêu Sát Thương',
        popular: true,
        description: 'Vũ khí cận chiến mạnh nhất server',
        features: [
          'Chỉ số: Sharpness X (Sắc bén 10)',
          'Fire Aspect IV (Đốt cháy liên tục)',
          'Unbreaking V & Mending (Tự sửa chữa)',
          'Hiệu ứng: Hút 15% máu khi chém trúng kẻ địch'
        ]
      },
      {
        id: 'item_set_titan',
        name: 'Full Set Giáp Chiến Thần Titan',
        price: 200000,
        originalPrice: 280000,
        badge: 'Giáp Bất Tử',
        description: 'Set đồ Netherite max thủ PvP và Boss',
        features: [
          'Full 4 món: Mũ, Giáp ngực, Quần, Giày Netherite',
          'Protection VII (Bảo vệ 7)',
          'Unbreaking V + Thorns IV (Phản sát thương)',
          'Kháng sát thương rơi từ trên cao & kháng dung nham 100%'
        ]
      },
      {
        id: 'item_pickaxe_silk',
        name: 'Cúp Thần Đào Nhanh (Silk & Fortune)',
        price: 90000,
        badge: 'Farm Cực Nhanh',
        description: 'Dụng cụ đào khoáng sản không giới hạn',
        features: [
          'Efficiency VIII (Hiệu suất 8 - Đào 1 hit)',
          'Fortune VI (Gia tài 6 - Nhân 4-6 lần khoáng sản)',
          'Tích hợp Silk Touch có thể bật/tắt',
          'Tự động gom vật phẩm vào rương'
        ]
      },
      {
        id: 'item_spawner_pack',
        name: 'Combo 10 Lồng Spawner Quái',
        price: 150000,
        badge: 'Farm Tiền & EXP',
        description: 'Tạo nông trại farm tự động kiếm hàng triệu money mỗi giờ',
        features: [
          '5 Lồng Iron Golem Spawner (Farm sắt bán tiền)',
          '5 Lồng Blaze Spawner (Farm que lửa & EXP)',
          'Tặng kèm 1 phễu hút tự động Auto-Collector'
        ]
      }
    ];
  }
}

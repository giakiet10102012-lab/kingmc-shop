'use client';

import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Tag, 
  DollarSign, 
  Coins, 
  Crown, 
  Sword, 
  Zap, 
  CreditCard,
  AlertCircle,
  X
} from 'lucide-react';
import { CustomPackageItem } from '@/lib/types';
import { formatVND, cn } from '@/lib/utils';
import { getDefaultCatalog } from '@/services';

interface AdminCatalogManagerProps {
  catalogJson?: string;
  onSaveCatalog: (newCatalogJson: string) => Promise<void>;
  isSaving: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả mặt hàng', icon: Package },
  { id: 'money', name: 'Money Ingame', icon: Coins },
  { id: 'rank', name: 'Rank & VIP', icon: Crown },
  { id: 'items', name: 'Vũ Khí & Đồ VIP', icon: Sword },
  { id: 'boosting', name: 'Cày Thuê', icon: Zap },
  { id: 'topup', name: 'Nạp Thẻ Cào', icon: CreditCard },
];

export default function AdminCatalogManager({
  catalogJson,
  onSaveCatalog,
  isSaving,
}: AdminCatalogManagerProps) {
  // Initialize items from catalogJson or fallback to default
  const [items, setItems] = useState<CustomPackageItem[]>(() => {
    if (catalogJson) {
      try {
        const parsed = JSON.parse(catalogJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return getDefaultCatalog();
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<CustomPackageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form states for Add/Edit
  const [formServiceId, setFormServiceId] = useState<string>('rank');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number>(50000);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formPopular, setFormPopular] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(i => i.serviceId === selectedCategory);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormServiceId(selectedCategory !== 'all' ? selectedCategory : 'rank');
    setFormName('');
    setFormPrice(50000);
    setFormOriginalPrice('');
    setFormUnit('');
    setFormBadge('Mới');
    setFormPopular(false);
    setFormDescription('');
    setFormFeaturesText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CustomPackageItem) => {
    setEditingItem(item);
    setFormServiceId(item.serviceId);
    setFormName(item.name);
    setFormPrice(item.price);
    setFormOriginalPrice(item.originalPrice || '');
    setFormUnit(item.unit || '');
    setFormBadge(item.badge || '');
    setFormPopular(Boolean(item.popular));
    setFormDescription(item.description);
    setFormFeaturesText((item.features || []).join('\n'));
    setIsModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mặt hàng này khỏi shop?')) {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      setHasUnsavedChanges(true);
    }
  };

  const handleResetDefault = () => {
    if (confirm('Khôi phục danh mục về các gói mặc định ban đầu? Các chỉnh sửa hiện tại sẽ bị hoàn tác.')) {
      const defaults = getDefaultCatalog();
      setItems(defaults);
      setHasUnsavedChanges(true);
    }
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const featuresArray = formFeaturesText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (editingItem) {
      // Update existing item
      const updated = items.map(it => {
        if (it.id === editingItem.id) {
          return {
            ...it,
            serviceId: formServiceId,
            name: formName.trim(),
            price: Number(formPrice) || 0,
            originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
            unit: formUnit.trim() || undefined,
            badge: formBadge.trim() || undefined,
            popular: formPopular,
            description: formDescription.trim(),
            features: featuresArray,
          };
        }
        return it;
      });
      setItems(updated);
    } else {
      // Add new item
      const newItem: CustomPackageItem = {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        serviceId: formServiceId,
        name: formName.trim(),
        price: Number(formPrice) || 0,
        originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
        unit: formUnit.trim() || undefined,
        badge: formBadge.trim() || undefined,
        popular: formPopular,
        description: formDescription.trim(),
        features: featuresArray,
      };
      setItems([...items, newItem]);
    }

    setHasUnsavedChanges(true);
    setIsModalOpen(false);
  };

  const handleSaveToDatabase = async () => {
    await onSaveCatalog(JSON.stringify(items));
    setHasUnsavedChanges(false);
  };

  const getCategoryBadge = (srvId: string) => {
    switch (srvId) {
      case 'money': return { label: 'Money Ingame', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
      case 'rank': return { label: 'Rank & VIP', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' };
      case 'items': return { label: 'Vũ Khí & Đồ', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
      case 'boosting': return { label: 'Cày Thuê', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
      case 'topup': return { label: 'Nạp Thẻ Cào', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
      default: return { label: srvId, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' };
    }
  };

  return (
    <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] shadow-xl overflow-hidden space-y-6">
      {/* Header bar */}
      <div className="border-b border-[#1e1e2e] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#12121a] via-[#161626] to-[#12121a]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Package className="text-emerald-400" size={22} />
            <span>Quản Lý Mặt Hàng & Gói Bán Hàng</span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 font-bold">
              {items.length} mục
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Thêm mới, sửa giá, sửa tên gói, thêm bớt quyền lợi hoặc xóa bất kỳ mặt hàng nào trên shop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] hover:bg-[#1a1a28] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors"
            title="Khôi phục danh mục gốc"
          >
            <RotateCcw size={14} />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            <Plus size={16} />
            <span>Thêm Mặt Hàng Mới</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs sm:text-sm font-bold transition-all shadow-md",
              hasUnsavedChanges 
                ? "bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] animate-pulse ring-2 ring-amber-400/50" 
                : "bg-emerald-500 hover:bg-emerald-400 text-[#0a0a0f]"
            )}
          >
            <Save size={16} />
            <span>{isSaving ? "Đang lưu..." : (hasUnsavedChanges ? "LƯU CÁC THAY ĐỔI (!)" : "LƯU DANH MỤC")}</span>
          </button>
        </div>
      </div>

      {/* Unsaved alert */}
      {hasUnsavedChanges && (
        <div className="mx-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-400" />
            <span>Bạn vừa chỉnh sửa danh mục hàng. Hãy bấm <strong>&quot;LƯU CÁC THAY ĐỔI&quot;</strong> để cập nhật trực tiếp lên website!</span>
          </div>
          <button
            type="button"
            onClick={handleSaveToDatabase}
            className="px-3 py-1 bg-amber-500 text-black rounded-lg font-bold text-xs hover:bg-amber-400 transition-colors shrink-0"
          >
            Lưu ngay
          </button>
        </div>
      )}

      {/* Category selector pills */}
      <div className="px-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.id === 'all' 
            ? items.length 
            : items.filter(i => i.serviceId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border",
                selectedCategory === cat.id
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-[#0a0a0f] border-[#1e1e2e] text-zinc-400 hover:text-zinc-200 hover:border-emerald-500/20"
              )}
            >
              <Icon size={14} />
              <span>{cat.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1e1e2e] text-zinc-300 font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Item Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const catInfo = getCategoryBadge(item.serviceId);
          return (
            <div
              key={item.id}
              className={cn(
                "relative rounded-2xl border p-4 flex flex-col justify-between transition-all group bg-[#0a0a0f]",
                item.popular 
                  ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                  : "border-[#1e1e2e] hover:border-emerald-500/30"
              )}
            >
              <div>
                {/* Header of card: Category and Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border", catInfo.color)}>
                    {catInfo.label}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                  {item.description}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-black text-emerald-400">
                    {formatVND(item.price)}
                  </span>
                  {item.originalPrice && (
                    <span className="text-xs text-zinc-500 line-through">
                      {formatVND(item.originalPrice)}
                    </span>
                  )}
                  {item.unit && (
                    <span className="text-xs text-zinc-400">/ {item.unit}</span>
                  )}
                </div>

                {/* Features count */}
                {item.features && item.features.length > 0 && (
                  <div className="space-y-1 text-[11px] text-zinc-400 border-t border-[#1e1e2e] pt-2 mb-3">
                    {item.features.slice(0, 3).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                    {item.features.length > 3 && (
                      <p className="text-[10px] text-zinc-500 italic">+ {item.features.length - 3} đặc quyền khác</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions: Edit & Delete */}
              <div className="pt-3 border-t border-[#1e1e2e] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="flex items-center gap-1 rounded-lg border border-[#1e1e2e] bg-[#12121a] hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <Edit3 size={13} />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Thêm / Sửa Mặt Hàng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e1e2e] mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="text-emerald-400" size={20} />
                <span>{editingItem ? 'Chỉnh Sửa Mặt Hàng' : 'Thêm Mặt Hàng / Gói Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1e1e2e]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="space-y-4 text-xs">
              {/* Category selection */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Thuộc Danh Mục Dịch Vụ</label>
                <select
                  value={formServiceId}
                  onChange={e => setFormServiceId(e.target.value)}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="money">💰 Money Ingame (Sàn /ah)</option>
                  <option value="rank">👑 Rank & VIP (Đặc quyền)</option>
                  <option value="items">⚔️ Vũ Khí & Đồ VIP (Netherite / Cúp / Spawner)</option>
                  <option value="boosting">⚡ Cày Thuê & Làm Nhiệm Vụ</option>
                  <option value="topup">💳 Nạp Thẻ Cào Điện Thoại</option>
                </select>
              </div>

              {/* Tên mặt hàng */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Tên Gói / Mặt Hàng</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Rank [MVP], Kiếm Thần Long X, 20M Money..."
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Giá bán & Giá gốc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Giá Bán Thực Tế (VNĐ)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formPrice}
                    onChange={e => setFormPrice(Number(e.target.value))}
                    placeholder="VD: 100000"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-emerald-400 font-bold outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Giá Gốc Gạch Đi (Tùy chọn)</label>
                  <input
                    type="number"
                    min={0}
                    value={formOriginalPrice}
                    onChange={e => setFormOriginalPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="VD: 150000"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-400 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Badge & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Nhãn Dán / Badge (Tùy chọn)</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    placeholder="VD: HOT, Bán Chạy, VIP Deal..."
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Đơn Vị Tính / Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="VD: 10M, 1 Tháng, 1 Món..."
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Checkbox Popular */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_popular"
                  checked={formPopular}
                  onChange={e => setFormPopular(e.target.checked)}
                  className="rounded border-[#1e1e2e] bg-[#0a0a0f] text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="chk_popular" className="text-zinc-300 cursor-pointer font-medium">
                  Đánh dấu là gói Phổ Biến / Nổi Bật (Khung phát sáng trên giao diện)
                </label>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Mô Tả Ngắn</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt về món đồ hoặc gói nạp này..."
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Danh sách tính năng / đặc quyền */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Đặc Quyền / Quyền Lợi (Mỗi dòng là 1 gạch đầu dòng)
                </label>
                <textarea
                  rows={4}
                  value={formFeaturesText}
                  onChange={e => setFormFeaturesText(e.target.value)}
                  placeholder={"Lệnh bay /fly tại sảnh\nKit VIP hàng ngày\n3 điểm /sethome"}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-2.5 text-zinc-100 outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[#1e1e2e] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] text-zinc-300 hover:bg-[#1e1e2e] font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {editingItem ? 'Lưu Cập Nhật' : 'Thêm Vào Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

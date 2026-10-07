import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOrderId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Bộ nhớ tạm lưu các mã đơn hàng admin đã dọn dẹp/ẩn
const adminHiddenOrders = new Set<string>();

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

const checkAdmin = (req: Request) => {
  const pin = (req.headers.get('x-admin-pin') || '').trim();
  const expectedPin = (process.env.ADMIN_PIN || 'kietgottop2').trim();
  return pin === expectedPin;
};

export async function POST(req: Request) {
  try {
    const { ign, money_m, total_vnd, user_id } = await req.json();
    
    // YÊU CẦU BẮT BUỘC ĐĂNG NHẬP TRƯỚC KHI MUA HÀNG
    if (!user_id) {
      return NextResponse.json({ 
        error: 'Vui lòng đăng nhập hoặc đăng ký tài khoản trước khi đặt hàng để lưu lịch sử giao dịch!' 
      }, { status: 401 });
    }

    if (!ign || money_m === undefined || total_vnd === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
    }

    // KIỂM TRA SỐ LƯỢNG MONEY TRONG KHO (STOCK)
    try {
      const { data: stockConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'money_stock')
        .maybeSingle();

      if (stockConfig && stockConfig.value !== undefined) {
        const currentStock = Number(stockConfig.value);
        if (!isNaN(currentStock) && currentStock <= 0) {
          return NextResponse.json({ 
            error: 'Shop hiện tại đang tạm hết Money trong kho (Stock = 0M). Vui lòng quay lại sau ít phút!' 
          }, { status: 400 });
        }
        if (!isNaN(currentStock) && money_m > currentStock) {
          return NextResponse.json({ 
            error: `Số lượng bạn đặt (${money_m}M) vượt quá số lượng Money còn trong kho (${currentStock}M)!` 
          }, { status: 400 });
        }
      }
    } catch (stockErr) {
      console.warn('Check stock warning:', stockErr);
    }

    const id = generateOrderId();
    
    const { data, error } = await supabase
      .from('orders')
      .insert([{ 
        id, 
        ign, 
        money_m, 
        total_vnd, 
        status: 'pending',
        user_id: user_id || null 
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ign = searchParams.get('ign');
    const userId = searchParams.get('user_id');
    const includeHidden = searchParams.get('include_hidden') === 'true';
    const isAdmin = checkAdmin(req);

    // If neither admin nor querying own orders by ign/user_id, reject
    if (!isAdmin && !ign && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
    }

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all' && status !== 'hidden') {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ign && !isAdmin) {
      query = query.eq('ign', ign);
    }

    const { data, error } = await query;
    if (error) throw error;

    // NẾU LÀ ADMIN:
    if (isAdmin && Array.isArray(data)) {
      // Đọc danh sách đơn ẩn từ app_configs để đồng bộ dữ liệu
      try {
        const { data: configs } = await supabase
          .from('app_configs')
          .select('key')
          .like('key', 'admin_hidden_%');
        if (configs) {
          configs.forEach((c: any) => {
            const hidId = c.key.replace('admin_hidden_', '');
            adminHiddenOrders.add(hidId);
          });
        }
      } catch {}

      // YÊU CẦU: Chỉ hiển thị đơn hàng khi khách đã nhấn xác nhận thanh toán (status !== 'pending')!
      const confirmedOrders = data.filter((o: any) => o.status !== 'pending');

      // Nếu Admin yêu cầu xem danh sách "Đã Dọn Dẹp"
      if (includeHidden || status === 'hidden') {
        const hiddenOrders = confirmedOrders.filter((o: any) => o.hidden_from_admin === true || adminHiddenOrders.has(o.id));
        return NextResponse.json(hiddenOrders);
      }

      // Mặc định: lọc bỏ các đơn đã dọn dẹp để admin không bị rối mắt
      const visibleOrders = confirmedOrders.filter((o: any) => {
        if (o.hidden_from_admin === true) return false;
        if (adminHiddenOrders.has(o.id)) return false;
        return true;
      });

      return NextResponse.json(visibleOrders);
    }

    // NẾU LÀ MEMBER (KHÁCH HÀNG):
    // Luôn trả về ĐẦY ĐỦ đơn hàng trong lịch sử mua của khách (kể cả admin đã dọn dẹp phía admin)
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, cancel_reason } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Allow 'paid_waiting' without admin pin (e.g. from PaymentModal when customer confirms payment)
    if (status !== 'paid_waiting' && !checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
    }

    // 1. LẤY THÔNG TIN ĐƠN HÀNG HIỆN TẠI ĐỂ BIẾT TRẠNG THÁI CŨ VÀ SỐ TIỀN M
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!currentOrder) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const orderMoneyM = Number(currentOrder.money_m) || 0;
    const oldStatus = currentOrder.status;

    // 2. QUẢN LÝ KHO (STOCK):
    // TRƯỜNG HỢP 1: Khách bấm "Xác nhận đã thanh toán" (từ pending sang paid_waiting)
    // -> BẮT ĐẦU TRỪ SỐ TIỀN TRONG KHO!
    if (status === 'paid_waiting' && oldStatus === 'pending') {
      try {
        const { data: stockRow } = await supabase
          .from('app_configs')
          .select('value')
          .eq('key', 'money_stock')
          .maybeSingle();

        const currentStock = stockRow && stockRow.value !== undefined ? Number(stockRow.value) : 1000;
        const newStock = Math.max(0, currentStock - orderMoneyM);

        await supabase.from('app_configs').upsert({
          key: 'money_stock',
          value: String(newStock),
          updated_at: new Date().toISOString()
        });
      } catch (stockErr) {
        console.warn('Deduct stock on confirm payment warning:', stockErr);
      }
    }

    // TRƯỜNG HỢP 2: HỦY ĐƠN HÀNG (Admin hủy đơn chuyển sang cancelled)
    // Nếu đơn này ĐÃ TỪNG được xác nhận thanh toán (oldStatus là paid_waiting hoặc completed)
    // -> HOÀN LẠI SỐ TIỀN VÀO KHO!
    if (status === 'cancelled' && (oldStatus === 'paid_waiting' || oldStatus === 'completed')) {
      try {
        const { data: stockRow } = await supabase
          .from('app_configs')
          .select('value')
          .eq('key', 'money_stock')
          .maybeSingle();

        const currentStock = stockRow && stockRow.value !== undefined ? Number(stockRow.value) : 1000;
        const newStock = currentStock + orderMoneyM;

        await supabase.from('app_configs').upsert({
          key: 'money_stock',
          value: String(newStock),
          updated_at: new Date().toISOString()
        });
      } catch (stockErr) {
        console.warn('Refund stock on cancel order warning:', stockErr);
      }
    }

    // TRƯỜNG HỢP 3: Phục hồi đơn từ Đã hủy sang Chờ mua AH hoặc Đã hoàn thành
    if ((status === 'paid_waiting' || status === 'completed') && oldStatus === 'cancelled') {
      try {
        const { data: stockRow } = await supabase
          .from('app_configs')
          .select('value')
          .eq('key', 'money_stock')
          .maybeSingle();

        const currentStock = stockRow && stockRow.value !== undefined ? Number(stockRow.value) : 1000;
        const newStock = Math.max(0, currentStock - orderMoneyM);

        await supabase.from('app_configs').upsert({
          key: 'money_stock',
          value: String(newStock),
          updated_at: new Date().toISOString()
        });
      } catch (stockErr) {
        console.warn('Deduct stock on re-activate warning:', stockErr);
      }
    }

    // 3. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
    const updateData: any = { status };
    if (cancel_reason !== undefined) {
      updateData.cancel_reason = cancel_reason;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// XÓA ĐƠN KHỎI GIAO DIỆN ADMIN (NHƯNG MEMBER VẪN XEM ĐƯỢC TRONG LỊCH SỬ MUA)
// VÀ XÓA LUÔN TICKET CỦA ĐƠN ĐÓ
export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action'); // 'hide' (default) | 'restore' | 'permanent'

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng cần thao tác' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
    }

    // 1. Kiểm tra đơn hàng hiện tại: BẮT BUỘC phải là 'cancelled' hoặc 'completed' mới được phép xóa!
    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng cần xóa' }, { status: 404 });
    }

    if (existingOrder.status !== 'cancelled' && existingOrder.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Chỉ có thể xóa đơn hàng khi đã HOÀN THÀNH hoặc ĐÃ HỦY! Vui lòng hoàn thành hoặc hủy đơn trước khi xóa.' 
      }, { status: 400 });
    }

    // NẾU ADMIN MUỐN KHÔI PHỤC LẠI ĐƠN VÀO BẢNG
    if (action === 'restore') {
      adminHiddenOrders.delete(id);
      try {
        await supabase.from('app_configs').delete().eq('key', `admin_hidden_${id}`);
      } catch {}
      try {
        await supabase.from('orders').update({ hidden_from_admin: false }).eq('id', id);
      } catch {}
      return NextResponse.json({ success: true, message: 'Đã khôi phục đơn hàng vào bảng quản lý của Admin' });
    }

    // NẾU ADMIN MUỐN XÓA VĨNH VIỄN KHỎI DATABASE
    if (action === 'permanent') {
      try {
        await supabase.from('order_messages').delete().eq('order_id', id);
      } catch {}
      try {
        await supabase.from('app_configs').delete().eq('key', `admin_hidden_${id}`);
      } catch {}
      adminHiddenOrders.delete(id);
      const { error: delErr } = await supabase.from('orders').delete().eq('id', id);
      if (delErr) throw delErr;
      return NextResponse.json({ success: true, message: 'Đã xóa vĩnh viễn đơn hàng khỏi cơ sở dữ liệu' });
    }

    // MẶC ĐỊNH: XÓA ĐƠN KHỎI BẢNG ADMIN (SOFT-DELETE) & XÓA LUÔN TICKET CỦA ĐƠN ĐÓ
    // 1. Xóa luôn toàn bộ tin nhắn ticket của đơn hàng này theo yêu cầu:
    try {
      await supabase.from('order_messages').delete().eq('order_id', id);
    } catch (ticketErr) {
      console.warn('Delete ticket messages warning:', ticketErr);
    }

    // 2. Ẩn đơn khỏi bảng Admin (Khách hàng Member vẫn xem được trong lịch sử mua):
    adminHiddenOrders.add(id);

    try {
      await supabase.from('app_configs').upsert({
        key: `admin_hidden_${id}`,
        value: 'true',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (cfgErr) {
      console.warn('Upsert admin_hidden config warning:', cfgErr);
    }

    try {
      await supabase.from('orders').update({ hidden_from_admin: true }).eq('id', id);
    } catch {}

    return NextResponse.json({ 
      success: true, 
      message: 'Đã dọn dẹp đơn khỏi bảng Admin và xóa ticket liên quan (Member vẫn xem được trong lịch sử mua).' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

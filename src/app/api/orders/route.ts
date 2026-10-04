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
    
    if (!ign || money_m === undefined || total_vnd === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
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

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ign && !isAdmin) {
      query = query.eq('ign', ign);
    }

    const { data, error } = await query;
    if (error) throw error;

    // NẾU LÀ ADMIN VÀ KHÔNG YÊU CẦU XEM ĐƠN ĐÃ DỌN DẸP:
    // Tự động lọc bỏ các đơn đã bị admin xóa/ẩn để admin không bị rối mắt
    if (isAdmin && !includeHidden && Array.isArray(data)) {
      // Đọc thêm danh sách đơn ẩn từ app_configs để đồng bộ dữ liệu
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

      const visibleOrders = data.filter((o: any) => {
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

    // Allow 'paid_waiting' without admin pin (e.g. from PaymentModal)
    if (status !== 'paid_waiting' && !checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key trên Vercel.' }, { status: 500 });
    }

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
export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action'); // 'hide' (default) | 'restore' | 'hard'

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

    // MẶC ĐỊNH: XÓA ĐƠN KHỎI BẢNG ADMIN (SOFT-DELETE / ẨN ĐƠN KHỎI BẢNG QUẢN LÝ)
    // Giúp Admin không bị loạn mắt khi có quá nhiều đơn cũ.
    // Đơn hàng VẪN NẰM TRONG CƠ SỞ DỮ LIỆU để Khách hàng (Member) vẫn xem được 100% trong Lịch Sử Mua của họ!
    adminHiddenOrders.add(id);

    // 1. Lưu vào bảng app_configs (Đảm bảo lưu thành công ngay cả khi bảng orders chưa có cột mới)
    try {
      await supabase.from('app_configs').upsert({
        key: `admin_hidden_${id}`,
        value: 'true',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (cfgErr) {
      console.warn('Upsert admin_hidden config warning:', cfgErr);
    }

    // 2. Cập nhật cột hidden_from_admin trên bảng orders nếu cột đã được tạo
    try {
      await supabase.from('orders').update({ hidden_from_admin: true }).eq('id', id);
    } catch {}

    return NextResponse.json({ 
      success: true, 
      message: 'Đã xóa đơn khỏi giao diện Admin thành công (Member vẫn xem được trong lịch sử mua).' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

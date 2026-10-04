import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOrderId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng cần xóa' }, { status: 400 });
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

    // 2. Xóa các tin nhắn ticket liên quan nếu có
    try {
      await supabase.from('order_messages').delete().eq('order_id', id);
    } catch {}

    // 3. Xóa đơn hàng
    const { error: delErr } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'Đã xóa vĩnh viễn đơn hàng thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

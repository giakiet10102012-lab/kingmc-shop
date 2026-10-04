import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OrderMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache fallback so chat works even before the Supabase SQL migration is run
const memoryMessages: Record<string, OrderMessage[]> = {};
const closedTickets: Record<string, boolean> = {};

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

// Kiểm tra xem ticket đã bị đóng chưa
async function isTicketClosed(orderId: string, supabase: any): Promise<boolean> {
  if (closedTickets[orderId] !== undefined) {
    return closedTickets[orderId];
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', `ticket_closed_${orderId}`)
        .maybeSingle();

      if (data && data.value === 'true') {
        closedTickets[orderId] = true;
        return true;
      }
    } catch {}
  }

  closedTickets[orderId] = false;
  return false;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Thiếu order_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const isClosed = await isTicketClosed(orderId, supabase);
    let messages: OrderMessage[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          messages = data;
          memoryMessages[orderId] = data;
        } else {
          messages = memoryMessages[orderId] || [];
        }
      } catch (dbErr) {
        console.warn('Supabase fetch messages warning:', dbErr);
        messages = memoryMessages[orderId] || [];
      }
    } else {
      messages = memoryMessages[orderId] || [];
    }

    return NextResponse.json({
      messages,
      is_closed: isClosed
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, sender, sender_name, message } = body;

    if (!order_id || !sender || !message?.trim()) {
      return NextResponse.json({ error: 'Thiếu nội dung tin nhắn hoặc thông tin đơn hàng' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const isAdmin = sender === 'admin';

    // If sender is admin, verify PIN
    if (isAdmin && !checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized: Admin PIN không chính xác' }, { status: 401 });
    }

    // Nếu không phải admin và ticket đã bị đóng, chặn không cho gửi
    const isClosed = await isTicketClosed(order_id, supabase);
    if (isClosed && !isAdmin) {
      return NextResponse.json({ 
        error: 'Ticket này đã được Admin đóng. Khách hàng không thể gửi thêm tin nhắn.' 
      }, { status: 403 });
    }

    const newMsg: OrderMessage = {
      id: Date.now(),
      order_id,
      sender: isAdmin ? 'admin' : 'customer',
      sender_name: sender_name || (isAdmin ? 'Admin Shop' : 'Khách hàng'),
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    // Store in-memory
    if (!memoryMessages[order_id]) {
      memoryMessages[order_id] = [];
    }
    memoryMessages[order_id].push(newMsg);

    // Save to Supabase if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('order_messages')
          .insert([{
            order_id: newMsg.order_id,
            sender: newMsg.sender,
            sender_name: newMsg.sender_name,
            message: newMsg.message,
            created_at: newMsg.created_at
          }])
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json(data);
        }
      } catch (dbErr) {
        console.warn('Supabase insert message exception:', dbErr);
      }
    }

    return NextResponse.json(newMsg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Admin TẮT hoặc MỞ LẠI Ticket
export async function PATCH(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized: Chỉ Admin mới có quyền tắt/mở ticket' }, { status: 401 });
    }

    const body = await req.json();
    const { order_id, is_closed } = body;

    if (!order_id || typeof is_closed !== 'boolean') {
      return NextResponse.json({ error: 'Thiếu order_id hoặc trạng thái is_closed' }, { status: 400 });
    }

    closedTickets[order_id] = is_closed;

    const supabase = getServiceClient();
    if (supabase) {
      try {
        await supabase.from('app_configs').upsert({
          key: `ticket_closed_${order_id}`,
          value: is_closed ? 'true' : 'false',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (dbErr) {
        console.warn('Supabase save ticket status warning:', dbErr);
      }
    }

    // Thêm tin nhắn thông báo tự động từ Hệ Thống
    const systemNotice: OrderMessage = {
      id: Date.now(),
      order_id,
      sender: 'admin',
      sender_name: 'HỆ THỐNG',
      message: is_closed 
        ? '🔒 Admin KingMC đã đóng / tạm khóa ticket này.' 
        : '🔓 Admin KingMC đã mở lại ticket này.',
      created_at: new Date().toISOString()
    };

    if (!memoryMessages[order_id]) {
      memoryMessages[order_id] = [];
    }
    memoryMessages[order_id].push(systemNotice);

    if (supabase) {
      try {
        await supabase.from('order_messages').insert([{
          order_id: systemNotice.order_id,
          sender: systemNotice.sender,
          sender_name: systemNotice.sender_name,
          message: systemNotice.message,
          created_at: systemNotice.created_at
        }]);
      } catch {}
    }

    return NextResponse.json({ 
      success: true, 
      is_closed, 
      message: is_closed ? 'Đã tắt ticket thành công' : 'Đã mở lại ticket thành công',
      systemNotice 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Admin XÓA TICKET BẤT CỨ LÚC NÀO
export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized: Chỉ Admin mới có quyền xóa ticket' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng order_id cần xóa ticket' }, { status: 400 });
    }

    // 1. Xóa trong bộ nhớ tạm
    memoryMessages[orderId] = [];
    delete closedTickets[orderId];

    // 2. Xóa trong cơ sở dữ liệu Supabase
    const supabase = getServiceClient();
    if (supabase) {
      try {
        await supabase.from('order_messages').delete().eq('order_id', orderId);
      } catch (dbErr) {
        console.warn('Supabase delete messages warning:', dbErr);
      }

      try {
        await supabase.from('app_configs').delete().eq('key', `ticket_closed_${orderId}`);
      } catch {}
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa vĩnh viễn toàn bộ tin nhắn ticket của đơn #${orderId} thành công.` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

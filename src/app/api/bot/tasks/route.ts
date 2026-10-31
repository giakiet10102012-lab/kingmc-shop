import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

const checkAuth = (req: Request) => {
  const pin = (req.headers.get('x-admin-pin') || req.headers.get('x-bot-key') || '').trim();
  const expectedPin = (process.env.ADMIN_PIN || 'kietgottop2').trim();
  return pin === expectedPin;
};

// GET: Bot gọi để lấy danh sách các đơn hàng đã thanh toán cần giao dịch (cần Mua /ah hoặc /pay)
export async function GET(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    // Lấy tất cả đơn hàng đã thanh toán đang chờ xử lý
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid_waiting')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Lấy mapping delivery_method fallback nếu cột chưa có trong table
    const { data: deliveryCfgs } = await supabase
      .from('app_configs')
      .select('key, value')
      .like('key', 'order_delivery_%');

    const deliveryMap = new Map<string, string>();
    if (deliveryCfgs) {
      deliveryCfgs.forEach((c: any) => {
        deliveryMap.set(c.key.replace('order_delivery_', ''), c.value);
      });
    }

    const tasks = (orders || []).map((o: any) => {
      const method = o.delivery_method || deliveryMap.get(o.id) || 'ah';
      const moneyRaw = Number(o.money_m) * 1000000;
      return {
        id: o.id,
        ign: o.ign,
        money_m: Number(o.money_m),
        money_raw: moneyRaw,
        total_vnd: Number(o.total_vnd),
        delivery_method: method, // 'pay' | 'ah'
        command: method === 'pay' 
          ? `/pay ${o.ign} ${moneyRaw}`
          : `/ah ${o.ign}`,
        created_at: o.created_at
      };
    });

    return NextResponse.json({
      tasks,
      count: tasks.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Bot gọi báo cáo đã hoàn thành giao dịch (mua xong /ah hoặc pay xong)
export async function POST(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, action, bot_name } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    if (action === 'complete' || !action) {
      // 1. Chuyển trạng thái đơn sang completed
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', id);

      // 2. Tự động gửi tin nhắn ticket
      const senderName = bot_name || 'Bot KingMC Tự Động';
      const actionMsg = order.delivery_method === 'pay'
        ? `🤖 [${senderName}]: Đã chuyển thành công ${order.money_m}M (/pay) vào tài khoản ingame của bạn!`
        : `🤖 [${senderName}]: Đã mua thành công món đồ ${order.money_m}M trên sàn /ah của bạn!`;

      try {
        await supabase.from('order_messages').insert([{
          order_id: id,
          sender: 'admin',
          sender_name: senderName,
          message: `${actionMsg} Đơn hàng #${id} đã hoàn thành 100%. Cảm ơn bạn đã ủng hộ KingMC Shop!`
        }]);
      } catch {}

      // 3. Thông báo về Discord nếu có cấu hình
      try {
        const { data: discCfg } = await supabase
          .from('app_configs')
          .select('value')
          .eq('key', 'discord_webhook_url')
          .maybeSingle();

        if (discCfg?.value && discCfg.value.startsWith('http')) {
          await fetch(discCfg.value.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `✅ **[BOT HOÀN THÀNH ĐƠN HÀNG]**\n• Mã đơn: **#${id}**\n• Người chơi: **${order.ign}**\n• Số lượng: **${order.money_m}M**\n• Hình thức: **${order.delivery_method === 'pay' ? '⚡ PAY TIỀN' : '🏪 MUA /AH'}**\n• Xử lý bởi: **${senderName}**`
            })
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Đơn hàng #${id} đã được đánh dấu hoàn thành bởi bot!`
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

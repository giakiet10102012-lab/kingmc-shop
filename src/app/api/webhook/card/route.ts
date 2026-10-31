import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatVND } from '@/lib/utils';
import { CardLog } from '@/lib/types';

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

// Hàm điều chỉnh kho
async function adjustStock(supabase: any, delta: number): Promise<number | null> {
  try {
    const { data: stockRow } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'money_stock')
      .maybeSingle();

    let currentStock = 1000;
    if (stockRow && stockRow.value !== undefined && stockRow.value !== null && !isNaN(Number(stockRow.value))) {
      currentStock = Number(stockRow.value);
    }

    const newStock = Math.max(0, currentStock + delta);
    await supabase.from('app_configs').upsert(
      { key: 'money_stock', value: String(newStock), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    return newStock;
  } catch (err) {
    console.error('adjustStock error:', err);
    return null;
  }
}

// Bắn thông báo về Discord Webhook Admin
async function sendDiscordNotification(webhookUrl: string | undefined, message: string) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (e) {
    console.warn('sendDiscordNotification warning:', e);
  }
}

// 1. GET: Lấy danh sách nhật ký thẻ cào (Dành cho Admin Dashboard)
export async function GET(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ logs: [] });
    }

    const { data: config } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'card_transaction_logs')
      .maybeSingle();

    let logs: CardLog[] = [];
    if (config?.value) {
      try {
        logs = JSON.parse(config.value);
      } catch {}
    }

    return NextResponse.json({ logs: Array.isArray(logs) ? logs : [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Xử lý callback Webhook từ cổng gạch thẻ (Doithe1s/Thesieuto)
export async function POST(req: Request) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      try {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } catch {}
    }

    const status = Number(body.status);
    const requestId = String(body.request_id || body.order_id || '');
    const declaredValue = Number(body.declared_value || 0);
    const realValue = Number(body.value || declaredValue);
    const message = String(body.message || '');

    if (!requestId) {
      return NextResponse.json({ error: 'Thiếu request_id' }, { status: 400 });
    }

    // 1. Lấy thông tin đơn hàng
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // Lấy link Discord Webhook
    let adminDiscordWebhook: string | undefined;
    try {
      const { data: discCfg } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'discord_webhook_url')
        .maybeSingle();
      if (discCfg?.value) adminDiscordWebhook = discCfg.value.trim();
    } catch {}

    // Cập nhật log thẻ cào
    try {
      const { data: currentCfg } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'card_transaction_logs')
        .maybeSingle();

      let cardLogs: CardLog[] = [];
      if (currentCfg?.value) cardLogs = JSON.parse(currentCfg.value);

      cardLogs = cardLogs.map((c: CardLog) => {
        if (c.order_id === requestId) {
          return {
            ...c,
            real_value: realValue,
            status: status === 1 ? 'success' : status === 2 ? 'wrong_amount' : 'invalid',
            message: message || (status === 1 ? 'Thẻ đúng' : 'Thẻ sai hoặc không hợp lệ')
          };
        }
        return c;
      });

      await supabase.from('app_configs').upsert({
        key: 'card_transaction_logs',
        value: JSON.stringify(cardLogs),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (logErr) {
      console.warn('Update card log error:', logErr);
    }

    // 2. Xử lý trạng thái thẻ
    // TRƯỜNG HỢP 1: THẺ ĐÚNG (status === 1)
    if (status === 1) {
      if (order.status === 'pending') {
        // Chuyển đơn sang paid_waiting
        await supabase.from('orders').update({ status: 'paid_waiting' }).eq('id', order.id);

        // Tự động trừ kho
        await adjustStock(supabase, -Number(order.money_m));

        // Tự động gửi tin nhắn vào Ticket
        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Hệ Thống Tự Động',
            message: `🤖 [Thẻ Cào Hợp Lệ]: Đã gạch thẻ thành công mệnh giá ${formatVND(realValue)}. Đơn hàng đã được duyệt tự động! Shop đang xử lý giao ${order.money_m}M Money cho bạn.`
          }]);
        } catch {}

        // Bắn Discord Webhook
        await sendDiscordNotification(
          adminDiscordWebhook,
          `🎉 **[GẠCH THẺ CÀO THÀNH CÔNG - ĐƠN #${order.id}]**\n` +
          `• Khách hàng: **${order.ign}**\n` +
          `• Mệnh giá: **${formatVND(realValue)}**\n` +
          `• Số Money mua: **${order.money_m}M**\n` +
          `• Hình thức: **${order.delivery_method === 'pay' ? '⚡ PAY TIỀN' : '🏪 MUA /AH'}**\n` +
          `• Trạng thái: **Đã thanh toán -> Đang chờ bot giao hàng!**`
        );
      }
    } 
    // TRƯỜNG HỢP 2: THẺ LỖI HOẶC SAI MỆNH GIÁ
    else {
      await sendDiscordNotification(
        adminDiscordWebhook,
        `❌ **[THẺ CÀO LỖI / KHÔNG THÀNH CÔNG - ĐƠN #${order.id}]**\n` +
        `• Khách hàng: **${order.ign}**\n` +
        `• Mệnh giá khai: **${formatVND(declaredValue)}** | Thực tế: **${formatVND(realValue)}**\n` +
        `• Lý do: **${message || 'Thẻ sai mã, số seri hoặc đã qua sử dụng'}**\n` +
        `• Vui lòng liên hệ khách để kiểm tra lại!`
      );
    }

    return NextResponse.json({ success: true, message: 'Received callback successfully' });
  } catch (error: any) {
    console.error('Card webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PATCH: Admin duyệt thẻ hoặc từ chối thẻ thủ công
export async function PATCH(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { log_id, action } = await req.json();
    if (!log_id || !action) {
      return NextResponse.json({ error: 'Thiếu log_id hoặc action' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    const { data: config } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'card_transaction_logs')
      .maybeSingle();

    let logs: CardLog[] = [];
    if (config?.value) {
      try {
        logs = JSON.parse(config.value);
      } catch {}
    }

    const targetLog = logs.find(l => l.id === log_id);
    if (!targetLog) {
      return NextResponse.json({ error: 'Không tìm thấy log thẻ' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', targetLog.order_id)
      .maybeSingle();

    if (action === 'approve') {
      targetLog.status = 'success';
      targetLog.message = 'Admin đã duyệt thẻ hợp lệ thủ công';

      if (order && order.status === 'pending') {
        await supabase.from('orders').update({ status: 'paid_waiting' }).eq('id', order.id);
        await adjustStock(supabase, -Number(order.money_m));

        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Admin Shop',
            message: `✅ [Thẻ Cào Hợp Lệ]: Admin đã xác nhận thẻ cào thành công! Shop đang chuẩn bị giao ${order.money_m}M Money cho bạn.`
          }]);
        } catch {}
      }
    } else if (action === 'reject') {
      targetLog.status = 'invalid';
      targetLog.message = 'Admin đã từ chối thẻ (thẻ sai hoặc đã nạp)';

      if (order && order.status === 'pending') {
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);

        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Admin Shop',
            message: `❌ [Thẻ Cào Không Hợp Lệ]: Thẻ cào của bạn không đúng hoặc đã qua sử dụng. Đơn hàng đã bị hủy. Vui lòng liên hệ Admin nếu có nhầm lẫn!`
          }]);
        } catch {}
      }
    }

    await supabase.from('app_configs').upsert({
      key: 'card_transaction_logs',
      value: JSON.stringify(logs),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    return NextResponse.json({ success: true, message: 'Cập nhật thẻ thành công!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Xóa 1 log thẻ hoặc xóa toàn bộ log
export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    if (id) {
      const { data: config } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'card_transaction_logs')
        .maybeSingle();

      let logs: CardLog[] = [];
      if (config?.value) {
        try {
          logs = JSON.parse(config.value);
        } catch {}
      }

      logs = logs.filter(l => l.id !== id);

      await supabase.from('app_configs').upsert({
        key: 'card_transaction_logs',
        value: JSON.stringify(logs),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      return NextResponse.json({ success: true, message: 'Đã xóa log thẻ' });
    } else {
      await supabase.from('app_configs').upsert({
        key: 'card_transaction_logs',
        value: '[]',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ log thẻ cào' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

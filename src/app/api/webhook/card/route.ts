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

// Chuẩn hóa mã đơn hàng
function normalizeOrderId(id: string): string {
  if (!id) return '';
  const match = id.match(/(?:#|\b)?KMC[\s\-_]?(\d{4,8})\b/i);
  if (match) return `KMC-${match[1]}`;
  const numMatch = id.match(/^\d{4,8}$/);
  if (numMatch) return `KMC-${numMatch[0]}`;
  return id.trim();
}

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

// Hàm cốt lõi: Xử lý kết quả Callback từ TheSieuRe / Doithe1s / Các cổng thẻ
async function processCardCallback(params: Record<string, any>) {
  const supabase = getServiceClient();
  if (!supabase) {
    return new Response('Supabase not configured', { status: 500 });
  }

  const status = Number(params.status);
  const rawRequestId = String(params.request_id || params.requestId || params.order_id || '').trim();
  const declaredValue = Number(params.declared_value || params.amount || 0);
  const realValue = Number(params.value || params.card_value || params.real_value || declaredValue);
  const message = String(params.message || '');
  const serial = String(params.serial || '').trim();
  const code = String(params.code || '').trim();
  const telco = String(params.telco || '').toUpperCase();
  const transId = String(params.trans_id || params.transaction_id || '');

  if (!rawRequestId && !serial && !code) {
    return new Response('Missing request_id or card info', { status: 400 });
  }

  // 1. Tìm đơn hàng
  const targetId = normalizeOrderId(rawRequestId);
  let order: any = null;

  if (targetId) {
    const { data } = await supabase.from('orders').select('*').eq('id', targetId).maybeSingle();
    order = data;
  }
  if (!order && rawRequestId) {
    const { data } = await supabase.from('orders').select('*').eq('id', rawRequestId).maybeSingle();
    order = data;
  }

  // Lấy link Discord Webhook của Admin
  let adminDiscordWebhook: string | undefined;
  try {
    const { data: discCfg } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'discord_webhook_url')
      .maybeSingle();
    if (discCfg?.value) adminDiscordWebhook = discCfg.value.trim();
  } catch {}

  // 2. Cập nhật nhật ký thẻ cào (card_transaction_logs)
  try {
    const { data: currentCfg } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'card_transaction_logs')
      .maybeSingle();

    let cardLogs: CardLog[] = [];
    if (currentCfg?.value) {
      try {
        cardLogs = JSON.parse(currentCfg.value);
        if (!Array.isArray(cardLogs)) cardLogs = [];
      } catch {}
    }

    let found = false;
    cardLogs = cardLogs.map((c: CardLog) => {
      const matchOrder = (rawRequestId && (c.order_id === rawRequestId || c.order_id === targetId));
      const matchCard = (serial && c.serial === serial) || (code && c.code === code);
      if (matchOrder || matchCard) {
        found = true;
        return {
          ...c,
          real_value: realValue > 0 ? realValue : c.real_value,
          status: status === 1 ? 'success' : status === 2 ? 'wrong_amount' : status === 99 ? 'pending' : 'invalid',
          message: message || (status === 1 ? 'Thẻ đúng, duyệt tự động thành công' : status === 2 ? 'Sai mệnh giá' : status === 99 ? 'Chờ duyệt' : 'Thẻ sai hoặc không hợp lệ')
        };
      }
      return c;
    });

    if (!found) {
      cardLogs.unshift({
        id: `CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        order_id: targetId || rawRequestId,
        ign: order ? order.ign : 'Khách nạp',
        telco: telco || (order ? order.card_telco : 'CARD'),
        code: code || '***',
        serial: serial || '***',
        declared_value: declaredValue,
        real_value: realValue,
        status: status === 1 ? 'success' : status === 2 ? 'wrong_amount' : status === 99 ? 'pending' : 'invalid',
        message: message || (status === 1 ? 'Thẻ đúng' : 'Thẻ không hợp lệ')
      });
    }

    await supabase.from('app_configs').upsert({
      key: 'card_transaction_logs',
      value: JSON.stringify(cardLogs.slice(0, 200)),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (logErr) {
    console.warn('Update card log error:', logErr);
  }

  // 3. TỰ ĐỘNG DUYỆT ĐƠN HÀNG KHI THẺ THÀNH CÔNG
  if (order) {
    // TRƯỜNG HỢP 1: THẺ ĐÚNG (status === 1)
    if (status === 1) {
      if (order.status === 'pending') {
        // Chuyển đơn sang paid_waiting để Bot giao hàng ngay lập tức!
        await supabase.from('orders').update({ status: 'paid_waiting' }).eq('id', order.id);

        // Tự động trừ kho
        await adjustStock(supabase, -Number(order.money_m));

        // Tự động gửi tin nhắn thông báo vào Ticket của đơn hàng
        const methodText = order.delivery_method === 'pay' 
          ? '⚡ Hình thức: Chuyển /pay trực tiếp. Vui lòng online ingame để nhận tiền.'
          : '🏪 Hình thức: Treo sàn /ah. Shop đang chuẩn bị vào game mua món đồ của bạn.';

        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Hệ Thống Tự Động',
            message: `🤖 [Thẻ Cào Hợp Lệ]: Đã gạch thẻ thành công mệnh giá ${formatVND(realValue)}. Đơn hàng đã được duyệt tự động thành công! ${methodText}`
          }]);
        } catch (msgErr) {
          console.warn('Auto ticket message error:', msgErr);
        }

        // Bắn Discord Webhook
        await sendDiscordNotification(
          adminDiscordWebhook,
          `🎉 **[GẠCH THẺ CÀO TỰ ĐỘNG THÀNH CÔNG - ĐƠN #${order.id}]**\n` +
          `• Khách hàng: **${order.ign}**\n` +
          `• Nhà mạng: **${order.card_telco || telco || 'Thẻ Cào'}** | Thực nhận: **${formatVND(realValue)}**\n` +
          `• Số Money: **${order.money_m}M**\n` +
          `• Hình thức: **${order.delivery_method === 'pay' ? '⚡ PAY TIỀN' : '🏪 MUA /AH'}**\n` +
          `• Cổng: **TheSieuRe.com** (Mã GD: \`${transId || rawRequestId}\`)\n` +
          `• Trạng thái: **Đã duyệt thanh toán ➔ Đang chờ bot giao hàng!**`
        );
      }
    } 
    // TRƯỜNG HỢP 2: THẺ SAI MỆNH GIÁ (status === 2)
    else if (status === 2) {
      if (order.status === 'pending' && realValue > 0) {
        await supabase.from('orders').update({ 
          status: 'paid_waiting',
          total_vnd: realValue 
        }).eq('id', order.id);

        await adjustStock(supabase, -Number(order.money_m));

        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Hệ Thống Tự Động',
            message: `⚠️ [Thẻ Sai Mệnh Giá]: Bạn khai báo ${formatVND(declaredValue)} nhưng mệnh giá thực tế là ${formatVND(realValue)}. Đơn hàng vẫn được duyệt tự động theo mệnh giá thực!`
          }]);
        } catch {}

        await sendDiscordNotification(
          adminDiscordWebhook,
          `⚠️ **[THẺ SAI MỆNH GIÁ - ĐÃ DUYỆT TỰ ĐỘNG - ĐƠN #${order.id}]**\n` +
          `• Khách: **${order.ign}** | Khai báo: ${formatVND(declaredValue)} | Thực tế: ${formatVND(realValue)}\n` +
          `• Trạng thái: Đã duyệt ➔ Chờ giao hàng!`
        );
      }
    } 
    // TRƯỜNG HỢP 3: THẺ LỖI / ĐÃ DÙNG (status === 3 hoặc status === 100...)
    else if (status === 3 || status > 2) {
      if (order.status === 'pending') {
        await supabase.from('orders').update({ 
          status: 'cancelled',
          cancel_reason: message || 'Thẻ sai mã, seri hoặc đã qua sử dụng'
        }).eq('id', order.id);

        try {
          await supabase.from('order_messages').insert([{
            order_id: order.id,
            sender: 'admin',
            sender_name: 'Hệ Thống Tự Động',
            message: `❌ [Thẻ Không Hợp Lệ]: ${message || 'Thẻ cào của bạn không đúng mã, sai seri hoặc đã qua sử dụng'}. Đơn hàng đã tự động bị hủy. Vui lòng liên hệ Admin nếu có nhầm lẫn!`
          }]);
        } catch {}

        await sendDiscordNotification(
          adminDiscordWebhook,
          `❌ **[THẺ CÀO LỖI / BỊ HỦY - ĐƠN #${order.id}]**\n` +
          `• Khách: **${order.ign}** | Seri: \`${serial}\`\n` +
          `• Lý do: **${message || 'Thẻ sai hoặc đã qua sử dụng'}**`
        );
      }
    }
  }

  // Chuẩn phản hồi HTTP cho TheSieuRe và Doithe1s: plain text 'OK' status 200
  return new Response('OK', { 
    status: 200, 
    headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
  });
}

// 1. GET: Nhận Callback từ TheSieuRe (URL query) HOẶC Trả log thẻ cào cho Admin Dashboard
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('request_id') || url.searchParams.get('requestId') || url.searchParams.get('order_id');
    const statusParam = url.searchParams.get('status');

    // NẾU CÓ THAM SỐ CỦA THESIEURE GỬI SANG (TheSieuRe Callback dùng GET) ➔ DUYỆT TỰ ĐỘNG!
    if (requestId || statusParam !== null) {
      const params = Object.fromEntries(url.searchParams.entries());
      return await processCardCallback(params);
    }

    // NẾU KHÔNG CÓ THAM SỐ GẠCH THẺ ➔ ĐÂY LÀ ADMIN DASHBOARD LẤY DANH SÁCH LOGS
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

// 2. POST: Nhận Callback từ TheSieuRe (JSON hoặc URL-encoded Form)
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    let params: Record<string, any> = Object.fromEntries(url.searchParams.entries());

    let rawText = '';
    try {
      rawText = await req.text();
    } catch {}

    if (rawText) {
      try {
        const json = JSON.parse(rawText);
        params = { ...params, ...json };
      } catch {
        try {
          const urlParams = new URLSearchParams(rawText);
          const entries = Object.fromEntries(urlParams.entries());
          params = { ...params, ...entries };
        } catch {}
      }
    }

    return await processCardCallback(params);
  } catch (error: any) {
    console.error('Card webhook error:', error);
    return new Response('Error: ' + error.message, { status: 500 });
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

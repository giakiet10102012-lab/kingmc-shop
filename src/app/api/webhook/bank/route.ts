import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatVND } from '@/lib/utils';
import { BankLog } from '@/lib/types';

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

// Hàm điều chỉnh kho an toàn
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

    const { data: updateRes, error: updateErr } = await supabase
      .from('app_configs')
      .update({ value: String(newStock), updated_at: new Date().toISOString() })
      .eq('key', 'money_stock')
      .select();

    if (updateErr || !updateRes || updateRes.length === 0) {
      await supabase
        .from('app_configs')
        .upsert(
          { key: 'money_stock', value: String(newStock), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
    }
    return newStock;
  } catch (err) {
    console.error('adjustStock error:', err);
    return null;
  }
}

// Lưu log vào app_configs
async function saveBankLog(supabase: any, log: BankLog) {
  try {
    const { data: currentCfg } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'bank_transaction_logs')
      .maybeSingle();

    let logs: BankLog[] = [];
    if (currentCfg?.value) {
      try {
        logs = JSON.parse(currentCfg.value);
        if (!Array.isArray(logs)) logs = [];
      } catch {}
    }

    // Đưa log mới nhất lên đầu, giới hạn tối đa 200 logs gần nhất
    logs.unshift(log);
    logs = logs.slice(0, 200);

    await supabase.from('app_configs').upsert({
      key: 'bank_transaction_logs',
      value: JSON.stringify(logs),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (err) {
    console.error('saveBankLog error:', err);
  }
}

// Bắn tin nhắn thông báo về Discord Webhook của Admin (nếu cấu hình)
async function sendDiscordNotification(webhookUrl: string | undefined, message: string) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message
      })
    });
  } catch (e) {
    console.warn('sendDiscordNotification warning:', e);
  }
}

// Trích xuất mã đơn hàng từ nội dung chuyển khoản
function extractOrderId(text: string): string | null {
  if (!text) return null;
  // Tìm dạng KMC-1234, KMC1234, KMC 1234, #KMC-1234, KMC_1234
  const match = text.match(/(?:#|\b)?KMC[\s\-_]?(\d{4,8})\b/i);
  if (match) {
    return `KMC-${match[1]}`;
  }
  return null;
}

// Trích xuất số tiền nếu payload là chuỗi text (Hỗ trợ Techcombank, ZaloPay, MBBank...)
function extractAmountFromText(text: string): number {
  if (!text) return 0;
  // 1. Dấu cộng kèm VND/đ hoặc không: ví dụ + VND 3,000 hoặc + 50,000 hoặc +VND 3.100
  let match = text.match(/\+\s*(?:vnd|vnđ|đ)?\s*([\d.,]+)/i);
  if (match) {
    const num = Number(match[1].replace(/[.,]/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }
  // Loại bỏ phần "Số dư" để tránh đọc nhầm số dư tài khoản
  const sanitized = text.replace(/(?:số\s*dư|so\s*du|sd)\s*:?\s*(?:vnd|vnđ|đ)?\s*[\d.,]+/gi, '');

  // 2. Chữ VND/đ đứng trước số: ví dụ VND 3,000 hoặc VND 50.000
  match = sanitized.match(/(?:vnd|vnđ|đ)\s*([\d.,]+)/i);
  if (match) {
    const num = Number(match[1].replace(/[.,]/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }
  // 3. Số đứng trước VND/đ: ví dụ 50.000d hoặc 50,000 VND hoặc 3000 VNĐ
  match = sanitized.match(/([\d.,]+)\s*(?:đ|vnd|vnđ)\b/i);
  if (match) {
    const num = Number(match[1].replace(/[.,]/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }
  // 4. Từ khóa nhận/tăng/cộng số tiền (ZaloPay)
  match = sanitized.match(/(?:nhan|nhận|tang|tăng|cong|cộng|duoc|được|tien|tiền|gia|giá|gd)\s*(?:duoc|được)?\s*:?\s*(?:vnd|vnđ|đ)?\s*([\d.,]+)/i);
  if (match) {
    const num = Number(match[1].replace(/[.,]/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
}

// POST: Xử lý Webhook biến động số dư từ Ngân Hàng hoặc Webhook Discord Forwarder
export async function POST(req: Request) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase chưa được cấu hình' }, { status: 500 });
    }

    let rawText = '';
    try {
      rawText = await req.text();
    } catch {}

    let body: any = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        // Tự động xử lý nếu thông báo ngân hàng chứa dấu xuống dòng \n làm hỏng cú pháp JSON
        try {
          const sanitized = rawText.replace(/[\r\n]+/g, ' ');
          body = JSON.parse(sanitized);
        } catch {
          body = { content: rawText };
        }
      }
    }

    // 1. Phân tích dữ liệu theo các loại Webhook ngân hàng phổ biến (SePay, Casso, Discord Webhook, Custom)
    let amount = 0;
    let content = '';
    let gateway = 'Bank';
    let referenceCode = `TXN-${Date.now().toString().slice(-6)}`;

    // Trường hợp 1: SePay Webhook
    if (body.transferAmount !== undefined || body.gateway !== undefined) {
      amount = Number(body.transferAmount) || 0;
      content = String(body.content || body.description || '');
      gateway = String(body.gateway || 'SePay');
      referenceCode = String(body.referenceCode || body.id || referenceCode);
    }
    // Trường hợp 2: Casso Webhook
    else if (Array.isArray(body.data) && body.data.length > 0) {
      const item = body.data[0];
      amount = Number(item.amount) || 0;
      content = String(item.description || '');
      gateway = 'Casso';
      referenceCode = String(item.tid || item.id || referenceCode);
    }
    // Trường hợp 3: Discord Webhook format (Bot forward tin nhắn ngân hàng vào Discord)
    else if (body.embeds && Array.isArray(body.embeds) && body.embeds.length > 0) {
      const embed = body.embeds[0];
      const desc = embed.description || embed.title || '';
      let fieldsText = '';
      if (Array.isArray(embed.fields)) {
        fieldsText = embed.fields.map((f: any) => `${f.name}: ${f.value}`).join(' | ');
      }
      content = `${body.content || ''} ${desc} ${fieldsText}`.trim();
      amount = Number(body.amount) || extractAmountFromText(content);
      gateway = 'DiscordWebhook';
    }
    // Trường hợp 4: Generic / MacroDroid / Custom JSON / Plain Text
    else {
      const parts = [
        body.big_text,
        body.not_big_text,
        body.notification,
        body.content,
        body.description,
        body.text,
        body.not_text,
        body.message,
        body.title,
        body.not_title,
        body.body,
        body.sub_text
      ].filter(Boolean);

      if (parts.length > 0) {
        content = parts
          .map((p: any) => typeof p === 'object' ? JSON.stringify(p) : String(p))
          .join(' ')
          .trim();
      } else {
        content = rawText.trim();
      }

      amount = Number(body.amount) || Number(body.total_vnd) || extractAmountFromText(content);
      gateway = String(body.gateway || body.bank || body.app || body.package || 'Techcombank');
      referenceCode = String(body.id || body.code || body.ref || referenceCode);
    }

    // 2. Tìm mã đơn hàng từ nội dung
    let extractedId = extractOrderId(content);

    // Fallback thông minh: Nếu không có KMC-XXXX nhưng có ghi Tên Ingame (IGN) khớp đơn gần đây
    if (!extractedId && amount > 0) {
      try {
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['pending', 'paid_waiting'])
          .order('created_at', { ascending: false })
          .limit(30);

        if (recentOrders && recentOrders.length > 0) {
          const contentLower = content.toLowerCase();
          const candidate = recentOrders.find((ord: any) => {
            if (!ord.ign || ord.ign.trim().length < 2) return false;
            const ignLower = ord.ign.trim().toLowerCase();
            const hasIgn = contentLower.includes(ignLower);
            const matchesAmount = Math.abs(Number(ord.total_vnd) - amount) <= 500;
            return hasIgn && matchesAmount;
          });

          if (candidate) {
            extractedId = candidate.id;
          }
        }
      } catch (e) {
        console.warn('Fallback match by IGN warning:', e);
      }
    }
    let matchedOrder: any = null;
    let logStatus: 'matched' | 'underpaid' | 'unmatched' = 'unmatched';
    let logNote = '';

    // Lấy link Discord Webhook của Admin (nếu đã cài đặt)
    let adminDiscordWebhook: string | undefined;
    try {
      const { data: discCfg } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'discord_webhook_url')
        .maybeSingle();
      if (discCfg?.value) adminDiscordWebhook = discCfg.value.trim();
    } catch {}

    if (extractedId) {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', extractedId)
        .maybeSingle();

      if (order) {
        matchedOrder = order;

        // Kiểm tra số tiền chuyển có đủ không
        if (amount >= Number(order.total_vnd)) {
          logStatus = 'matched';
          logNote = `Khớp đơn #${order.id} (${order.ign}). Số tiền: ${formatVND(amount)}`;

          // Nếu đơn đang ở trạng thái pending -> Tự động xác nhận thành paid_waiting và trừ kho!
          if (order.status === 'pending') {
            await supabase
              .from('orders')
              .update({ status: 'paid_waiting' })
              .eq('id', order.id);

            // Tự động trừ kho
            await adjustStock(supabase, -Number(order.money_m));

            // Tự động gửi tin nhắn vào Ticket của đơn hàng
            const methodText = order.delivery_method === 'pay' 
              ? '⚡ Hình thức: Chuyển /pay trực tiếp. Vui lòng online ingame để nhận tiền.'
              : '🏪 Hình thức: Treo sàn /ah. Shop đang chuẩn bị vào game mua món đồ của bạn.';

            try {
              await supabase.from('order_messages').insert([{
                order_id: order.id,
                sender: 'admin',
                sender_name: 'Hệ Thống Tự Động',
                message: `🤖 [Xác Nhận Tự Động]: Đã nhận thanh toán ${formatVND(amount)} từ ngân hàng (Mã GD: ${referenceCode}). Đơn hàng đã được duyệt tự động thành công! ${methodText}`
              }]);
            } catch (ticketErr) {
              console.warn('Auto ticket message warning:', ticketErr);
            }

            // Bắn tin nhắn về Discord Webhook của Admin
            await sendDiscordNotification(
              adminDiscordWebhook,
              `🎉 **[BIẾN ĐỘNG SỐ DƯ - KHỚP ĐƠN THÀNH CÔNG]**\n` +
              `• Mã đơn: **#${order.id}**\n` +
              `• Tên ingame: **${order.ign}**\n` +
              `• Số tiền nhận: **${formatVND(amount)}** (Đủ 100%)\n` +
              `• Số Money mua: **${order.money_m}M**\n` +
              `• Hình thức giao: **${order.delivery_method === 'pay' ? '⚡ PAY TIỀN' : '🏪 MUA /AH'}**\n` +
              `• Nội dung CK: \`${content}\`\n` +
              `• Trạng thái: **Đã duyệt thanh toán -> Chờ giao hàng**`
            );
          } else {
            logNote = `Đơn #${order.id} đã được khách/admin xác nhận trước đó (trạng thái: ${order.status})`;

            // Bắn tin báo tiền về tài khoản ngân hàng cho Admin
            await sendDiscordNotification(
              adminDiscordWebhook,
              `🎉 **[BIẾN ĐỘNG SỐ DƯ - TIỀN ĐÃ VỀ TÀI KHOẢN]**\n` +
              `• Mã đơn: **#${order.id}** (${order.ign})\n` +
              `• Số tiền: **${formatVND(amount)}** (Mã GD: \`${referenceCode}\`)\n` +
              `• Trạng thái hiện tại: **${order.status}**\n` +
              `• Đơn hàng đã có tiền thực tế về tài khoản ngân hàng!`
            );
          }
        } else {
          logStatus = 'underpaid';
          logNote = `Đơn #${order.id} thiếu tiền! Yêu cầu: ${formatVND(order.total_vnd)} nhưng nhận: ${formatVND(amount)}`;

          await sendDiscordNotification(
            adminDiscordWebhook,
            `⚠️ **[CẢNH BÁO CHUYỂN THIẾU TIỀN]**\n` +
            `• Mã đơn: **#${order.id}** (${order.ign})\n` +
            `• Yêu cầu: **${formatVND(order.total_vnd)}**\n` +
            `• Thực nhận: **${formatVND(amount)}**\n` +
            `• Nội dung CK: \`${content}\`\n` +
            `• Admin vui lòng liên hệ khách để bổ sung!`
          );
        }
      } else {
        logStatus = 'unmatched';
        logNote = `Tìm thấy mã ${extractedId} nhưng không có đơn hàng này trong hệ thống.`;
      }
    } else {
      logStatus = 'unmatched';
      logNote = 'Không tìm thấy cú pháp mã đơn (KMC-XXXX) trong nội dung chuyển khoản.';

      // Báo về Discord để Admin đối soát thủ công nếu có tiền vào
      if (amount > 0) {
        await sendDiscordNotification(
          adminDiscordWebhook,
          `❓ **[TIỀN VÀO - CHƯA KHỚP MÃ ĐƠN]**\n` +
          `• Số tiền: **${formatVND(amount)}**\n` +
          `• Cổng: **${gateway}** (Mã GD: \`${referenceCode}\`)\n` +
          `• Nội dung: \`${content}\`\n` +
          `• Lưu ý: Khách không ghi mã đơn hoặc sai cú pháp. Admin vui lòng vào Web khớp đơn thủ công!`
        );
      }
    }

    // Dọn dẹp hiển thị log: loại bỏ các chuỗi JSON thô như {"content": ...} nếu có
    let displayContent = content;
    try {
      if (displayContent.includes('{"') || displayContent.includes('{\"')) {
        displayContent = displayContent.replace(/\{[^{}]*"content"[^{}]*\}/g, '').trim();
      }
    } catch {}
    displayContent = displayContent.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!displayContent) displayContent = content.slice(0, 200);

    // 3. Ghi vào nhật ký biến động số dư (Bank Logs)
    const newLog: BankLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      amount,
      content: displayContent,
      order_id: matchedOrder ? matchedOrder.id : extractedId,
      status: logStatus,
      gateway,
      note: logNote
    };

    await saveBankLog(supabase, newLog);

    return NextResponse.json({
      success: true,
      matched: logStatus === 'matched',
      status: logStatus,
      log: newLog
    });
  } catch (error: any) {
    console.error('API Bank Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Lấy danh sách Bank Logs cho Admin xem mọi lúc mọi nơi
export async function GET(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ logs: [] });
    }

    const { data } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'bank_transaction_logs')
      .maybeSingle();

    let logs: BankLog[] = [];
    if (data?.value) {
      try {
        logs = JSON.parse(data.value);
        if (!Array.isArray(logs)) logs = [];
      } catch {}
    }

    return NextResponse.json({
      logs,
      total: logs.length,
      webhook_url: 'https://kingmc-shop.vercel.app/api/webhook/bank'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Khớp đơn thủ công (Nếu khách chuyển tiền quên ghi mã đơn)
export async function PATCH(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { log_id, order_id } = await req.json();
    if (!log_id || !order_id) {
      return NextResponse.json({ error: 'Thiếu log_id hoặc order_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    const targetOrderId = extractOrderId(order_id) || order_id.toUpperCase().trim();

    // 1. Lấy đơn hàng cần khớp
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', targetOrderId)
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // 2. Cập nhật trạng thái đơn sang paid_waiting và trừ kho nếu đang là pending
    if (order.status === 'pending') {
      await supabase.from('orders').update({ status: 'paid_waiting' }).eq('id', order.id);
      await adjustStock(supabase, -Number(order.money_m));

      const methodText = order.delivery_method === 'pay' 
        ? '⚡ Hình thức: Chuyển /pay trực tiếp. Vui lòng online ingame để nhận tiền.'
        : '🏪 Hình thức: Treo sàn /ah. Shop đang chuẩn bị vào game mua món đồ của bạn.';

      try {
        await supabase.from('order_messages').insert([{
          order_id: order.id,
          sender: 'admin',
          sender_name: 'Admin Shop',
          message: `✅ [Khớp Tiền Thủ Công]: Admin đã xác nhận thanh toán cho đơn hàng của bạn! ${methodText}`
        }]);
      } catch (ticketErr) {
        console.warn('Manual ticket message warning:', ticketErr);
      }
    }

    // 3. Cập nhật log tương ứng
    const { data: currentCfg } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'bank_transaction_logs')
      .maybeSingle();

    let logs: BankLog[] = [];
    if (currentCfg?.value) {
      try {
        logs = JSON.parse(currentCfg.value);
      } catch {}
    }

    logs = logs.map(l => {
      if (l.id === log_id) {
        return {
          ...l,
          status: 'matched',
          order_id: order.id,
          note: `Admin đã khớp đơn #${order.id} thủ công.`
        };
      }
      return l;
    });

    await supabase.from('app_configs').upsert({
      key: 'bank_transaction_logs',
      value: JSON.stringify(logs),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    return NextResponse.json({ success: true, message: `Đã khớp thủ công với đơn #${order.id} thành công!` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa hoặc xóa toàn bộ bank logs
export async function DELETE(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const logId = searchParams.get('id');

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    const { data: currentCfg } = await supabase
      .from('app_configs')
      .select('value')
      .eq('key', 'bank_transaction_logs')
      .maybeSingle();

    let logs: BankLog[] = [];
    if (currentCfg?.value) {
      try {
        logs = JSON.parse(currentCfg.value);
      } catch {}
    }

    if (logId) {
      logs = logs.filter(l => l.id !== logId);
    } else {
      logs = [];
    }

    await supabase.from('app_configs').upsert({
      key: 'bank_transaction_logs',
      value: JSON.stringify(logs),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    return NextResponse.json({ success: true, message: 'Đã cập nhật danh sách log thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

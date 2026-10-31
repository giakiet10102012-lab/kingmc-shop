const THESIEURE_TIERS: Record<number, number> = {
  10000: 19.5,
  20000: 19.5,
  30000: 19.5,
  50000: 14.5,
  100000: 14.5,
  200000: 14.5,
  300000: 14.5,
  500000: 16.5,
  1000000: 16.5
};

function getTheSieuReDiscount(amount: number, fallback: number = 20): number {
  return THESIEURE_TIERS[amount] !== undefined ? THESIEURE_TIERS[amount] : fallback;
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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

const generateOrderId = () => `KMC-${Math.floor(1000 + Math.random() * 9000)}`;

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

export async function POST(req: Request) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
    }

    const body = await req.json();
    const { ign, telco, code, serial, amount, user_id, delivery_method } = body;

    if (!ign || !telco || !code || !serial || !amount) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin thẻ cào' }, { status: 400 });
    }

    const declaredAmount = Number(amount);
    if (isNaN(declaredAmount) || declaredAmount < 10000) {
      return NextResponse.json({ error: 'Mệnh giá thẻ tối thiểu là 10.000 VNĐ' }, { status: 400 });
    }

    // 1. Đọc cấu hình shop (tỷ giá, chiết khấu thẻ cào, partner id/key, gateway url)
    const { data: configs } = await supabase.from('app_configs').select('*');
    const configMap = new Map<string, string>();
    if (configs) {
      configs.forEach((c: any) => configMap.set(c.key, c.value));
    }

    const ratePerM = Number(configMap.get('rate_per_m') || '50');
    const defaultDiscount = Number(configMap.get('card_discount_percent') || '20');
    // Áp dụng bảng chiết khấu TheSieuRe chính xác theo mệnh giá:
    const discountPercent = getTheSieuReDiscount(declaredAmount, defaultDiscount);
    const partnerId = (configMap.get('card_partner_id') || '').trim();
    const partnerKey = (configMap.get('card_partner_key') || '').trim();
    const gatewayUrl = (configMap.get('card_gateway_url') || 'https://thesieure.com/chargingws/v2').trim();
    const adminDiscordWebhook = configMap.get('discord_webhook_url');

    // 2. Tính số tiền thực nhận sau chiết khấu và số Money
    const realVND = Math.floor(declaredAmount * (1 - discountPercent / 100));
    const moneyM = Math.floor(realVND / (ratePerM || 50));

    if (moneyM <= 0) {
      return NextResponse.json({ error: 'Mệnh giá thẻ quá nhỏ, không đủ quy đổi' }, { status: 400 });
    }

    // Kiểm tra kho
    const currentStock = Number(configMap.get('money_stock') || '1000');
    if (moneyM > currentStock) {
      return NextResponse.json({ 
        error: `Số lượng quy đổi (${moneyM}M) vượt quá số Money trong kho (${currentStock}M)!` 
      }, { status: 400 });
    }

    const orderId = generateOrderId();
    const method = delivery_method === 'ah' ? 'ah' : 'pay'; // Mặc định ưu tiên /pay

    // 3. Tạo đơn hàng trong bảng orders
    const insertObj: any = {
      id: orderId,
      ign: ign.trim(),
      money_m: moneyM,
      total_vnd: realVND,
      status: 'pending',
      user_id: user_id || null,
      delivery_method: method
    };

    let orderData: any = null;
    const { data: inserted, error: orderErr } = await supabase
      .from('orders')
      .insert([insertObj])
      .select()
      .single();

    if (orderErr) {
      if (orderErr.message?.includes('delivery_method') || orderErr.code === '42703') {
        delete insertObj.delivery_method;
        const retryRes = await supabase.from('orders').insert([insertObj]).select().single();
        if (retryRes.error) throw retryRes.error;
        orderData = { ...retryRes.data, delivery_method: method };
      } else {
        throw orderErr;
      }
    } else {
      orderData = inserted;
    }
    orderData.payment_method = 'card';
    orderData.card_telco = telco;
    orderData.card_declared_value = declaredAmount;
    orderData.card_real_value = realVND;

    // Lưu thẻ vào danh sách card_logs trong app_configs
    const newCardLog: CardLog = {
      id: `CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      order_id: orderId,
      ign: ign.trim(),
      telco: String(telco).toUpperCase(),
      code: String(code).trim(),
      serial: String(serial).trim(),
      declared_value: declaredAmount,
      real_value: realVND,
      status: 'pending',
      message: 'Đang gửi sang cổng gạch thẻ'
    };

    let cardLogs: CardLog[] = [];
    try {
      const existingLogs = configMap.get('card_transaction_logs');
      if (existingLogs) cardLogs = JSON.parse(existingLogs);
    } catch {}
    cardLogs.unshift(newCardLog);
    cardLogs = cardLogs.slice(0, 200);

    await supabase.from('app_configs').upsert({
      key: 'card_transaction_logs',
      value: JSON.stringify(cardLogs),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    // Lưu delivery method fallback
    await supabase.from('app_configs').upsert({
      key: `order_delivery_${orderId}`,
      value: method,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    // 4. Nếu đã cấu hình Partner ID & Key -> Gọi API gạch thẻ tự động (TheSieuRe.com)
    let apiSubmitted = false;
    let apiMessage = '';

    if (partnerId && partnerKey) {
      try {
        const cleanCode = String(code).trim();
        const cleanSerial = String(serial).trim();
        const normalizedTelco = String(telco).toUpperCase() === 'VIETNAMOBILE' ? 'VNMOBI' : String(telco).toUpperCase();
        const command = 'charging';

        // Chữ ký MD5 theo chuẩn TheSieuRe:
        // sign = md5(partner_key + code + command + partner_id + request_id + serial + telco)
        const signTheSieuRe = crypto
          .createHash('md5')
          .update(`${partnerKey}${cleanCode}${command}${partnerId}${orderId}${cleanSerial}${normalizedTelco}`)
          .digest('hex');

        // Chữ ký MD5 dự phòng nếu Admin dùng Doithe1s
        const signDoithe1s = crypto
          .createHash('md5')
          .update(`${partnerKey}${cleanCode}${cleanSerial}`)
          .digest('hex');

        const sign = gatewayUrl.includes('doithe1s') ? signDoithe1s : signTheSieuRe;

        const postData = {
          telco: normalizedTelco,
          code: cleanCode,
          serial: cleanSerial,
          amount: String(declaredAmount),
          request_id: orderId,
          partner_id: partnerId,
          command: command,
          sign: sign
        };

        const formParams = new URLSearchParams();
        Object.entries(postData).forEach(([k, v]) => formParams.append(k, v));

        // TheSieuRe ưu tiên application/x-www-form-urlencoded
        const apiRes = await fetch(gatewayUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formParams.toString()
        });

        const apiData = await apiRes.json().catch(() => null);
        if (apiData) {
          apiSubmitted = true;
          apiMessage = apiData.message || (apiData.status === 99 ? 'Thẻ đang chờ duyệt' : `Status: ${apiData.status}`);
        }
      } catch (callErr: any) {
        console.warn('Call TheSieuRe charging API error:', callErr);
      }
    }

    // 5. Gửi thông báo về Discord cho Admin
    await sendDiscordNotification(
      adminDiscordWebhook,
      `💳 **[NẠP THẺ CÀO MỚI - ĐƠN #${orderId}]**\n` +
      `• Khách hàng: **${ign}**\n` +
      `• Nhà mạng: **${telco.toUpperCase()}** | Mệnh giá: **${formatVND(declaredAmount)}**\n` +
      `• Mã thẻ (PIN): \`${code}\`\n` +
      `• Số Seri: \`${serial}\`\n` +
      `• Thực nhận (-${discountPercent}%): **${formatVND(realVND)}** ➔ **+${moneyM}M Money**\n` +
      `• Hình thức nhận: **${method === 'pay' ? '⚡ PAY TIỀN' : '🏪 MUA /AH'}**\n` +
      `• Cổng xử lý: **TheSieuRe.com** (${apiSubmitted ? `Đã gửi API: ${apiMessage}` : 'Chờ Admin duyệt thủ công'})`
    );

    return NextResponse.json({
      success: true,
      message: 'Gửi thẻ cào thành công! Vui lòng chờ hệ thống kiểm tra và cộng tiền tự động.',
      order: orderData,
      card: newCardLog
    });
  } catch (error: any) {
    console.error('Card charge error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý nạp thẻ cào' }, { status: 500 });
  }
}

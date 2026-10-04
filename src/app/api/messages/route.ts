import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OrderMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache fallback so chat works even before the Supabase SQL migration is run
const memoryMessages: Record<string, OrderMessage[]> = {};

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Thiếu order_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          // Sync with memory
          memoryMessages[orderId] = data;
          return NextResponse.json(data);
        }
      } catch (dbErr) {
        console.warn('Supabase fetch messages warning:', dbErr);
      }
    }

    // Fallback to in-memory messages
    return NextResponse.json(memoryMessages[orderId] || []);
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

    // If sender is admin, verify PIN
    if (sender === 'admin' && !checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized: Admin PIN không chính xác' }, { status: 401 });
    }

    const newMsg: OrderMessage = {
      id: Date.now(),
      order_id,
      sender: sender === 'admin' ? 'admin' : 'customer',
      sender_name: sender_name || (sender === 'admin' ? 'Admin Shop' : 'Khách hàng'),
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    // Store in-memory
    if (!memoryMessages[order_id]) {
      memoryMessages[order_id] = [];
    }
    memoryMessages[order_id].push(newMsg);

    // Save to Supabase if available
    const supabase = getServiceClient();
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

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOrderId } from '@/lib/utils';

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
};

const checkAdmin = (req: Request) => {
  const pin = req.headers.get('x-admin-pin');
  return pin === process.env.ADMIN_PIN;
};

export async function POST(req: Request) {
  try {
    const { ign, money_m, total_vnd } = await req.json();
    
    if (!ign || money_m === undefined || total_vnd === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const id = generateOrderId();
    
    const { data, error } = await supabase
      .from('orders')
      .insert([{ id, ign, money_m, total_vnd, status: 'pending' }])
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
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const supabase = getServiceClient();
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
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

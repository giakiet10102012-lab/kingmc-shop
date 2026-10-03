import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ShopSettings } from '@/lib/types';

const DEFAULT_SETTINGS: ShopSettings = {
  rate_per_m: 10000,
  bank_name: 'MB Bank',
  bank_id: 'MB',
  bank_account: '0123456789',
  bank_owner: 'NGUYEN VAN A',
};

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

const checkAdmin = (req: Request) => {
  const pin = req.headers.get('x-admin-pin');
  return pin === (process.env.ADMIN_PIN || '123456');
};

export async function GET() {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const { data, error } = await supabase.from('app_configs').select('*');
    if (error || !data || data.length === 0) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const settings: ShopSettings = { ...DEFAULT_SETTINGS };
    data.forEach((row: any) => {
      if (row.key === 'rate_per_m') {
        settings.rate_per_m = Number(row.value) || DEFAULT_SETTINGS.rate_per_m;
      } else if (row.key === 'is_active') {
        settings.is_active = row.value !== 'false';
      } else {
        (settings as any)[row.key] = row.value;
      }
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Mã PIN Admin không đúng' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase URL hoặc Key' }, { status: 500 });
    }

    const upserts = Object.keys(body).map((key) => ({
      key,
      value: String(body[key]),
      updated_at: new Date().toISOString()
    }));

    if (upserts.length > 0) {
      const { error } = await supabase.from('app_configs').upsert(upserts, { onConflict: 'key' });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

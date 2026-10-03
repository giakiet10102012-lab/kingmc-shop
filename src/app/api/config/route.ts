import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ShopSettings } from '@/lib/types';

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
};

const checkAdmin = (req: Request) => {
  const pin = req.headers.get('x-admin-pin');
  return pin === process.env.ADMIN_PIN;
};

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from('app_configs').select('*');
    if (error) throw error;

    const settings: Partial<ShopSettings> = {};
    data.forEach((row: any) => {
      if (row.key === 'rate_per_m') {
        settings.rate_per_m = Number(row.value);
      } else {
        (settings as any)[row.key] = row.value;
      }
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = getServiceClient();

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

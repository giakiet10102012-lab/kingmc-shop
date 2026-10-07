import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ShopSettings } from '@/lib/types';

const DEFAULT_SETTINGS: ShopSettings = {
  rate_per_m: 0,
  bank_name: 'MB Bank',
  bank_id: 'MB',
  bank_account: '0123456789',
  bank_owner: 'NGUYEN VAN A',
  shop_notice: '',
  is_active: true,
  qr_image_url: '',
  money_stock: 1000
};

// Global in-memory cache fallback in case Supabase is unavailable
let memorySettings: ShopSettings = { ...DEFAULT_SETTINGS };

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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = getServiceClient();
    if (supabase) {
      const { data, error } = await supabase.from('app_configs').select('*');
      if (!error && data && data.length > 0) {
        const settings: ShopSettings = { ...memorySettings };
        data.forEach((row: any) => {
          if (row.key === 'rate_per_m') {
            settings.rate_per_m = row.value !== undefined && !isNaN(Number(row.value)) ? Number(row.value) : settings.rate_per_m;
          } else if (row.key === 'is_active') {
            settings.is_active = row.value !== 'false';
          } else if (row.key === 'money_stock') {
            settings.money_stock = Number(row.value) !== undefined ? Number(row.value) : 1000;
          } else {
            (settings as any)[row.key] = row.value;
          }
        });
        memorySettings = { ...settings };
      }
    }
    return NextResponse.json(memorySettings);
  } catch (error: any) {
    return NextResponse.json(memorySettings);
  }
}

async function handleSaveConfig(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Mã PIN Admin không đúng' }, { status: 401 });
    }

    const body = await req.json();

    // 1. Luôn cập nhật bộ nhớ tạm
    memorySettings = {
      ...memorySettings,
      ...body
    };

    let dbSuccess = false;
    let dbWarning: string | null = null;

    // 2. Cố gắng đồng bộ lên Supabase nếu có cấu hình
    const supabase = getServiceClient();
    if (supabase) {
      try {
        const upserts = Object.keys(body).map((key) => ({
          key,
          value: typeof body[key] === 'object' ? JSON.stringify(body[key]) : String(body[key]),
          updated_at: new Date().toISOString()
        }));

        if (upserts.length > 0) {
          const { error } = await supabase.from('app_configs').upsert(upserts, { onConflict: 'key' });
          if (error) {
            console.warn('Supabase upsert warning:', error.message);
            dbWarning = error.message;
          } else {
            dbSuccess = true;
          }
        }
      } catch (dbErr: any) {
        console.warn('Supabase save exception:', dbErr.message);
        dbWarning = dbErr.message;
      }
    } else {
      dbWarning = 'Chưa cấu hình Supabase URL hoặc Key trên Vercel';
    }

    return NextResponse.json({
      success: true,
      savedToDatabase: dbSuccess,
      warning: dbWarning,
      settings: memorySettings
    });
  } catch (error: any) {
    console.error('API Config save error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý lưu cấu hình' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleSaveConfig(req);
}

export async function PUT(req: Request) {
  return handleSaveConfig(req);
}

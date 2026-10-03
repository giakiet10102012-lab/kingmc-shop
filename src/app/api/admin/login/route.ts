import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const correctPin = process.env.ADMIN_PIN || 'kietgottop2';

    if (!pin) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu quản trị' }, { status: 400 });
    }

    if (String(pin).trim() !== correctPin.trim()) {
      return NextResponse.json({ error: 'Mật khẩu quản trị không chính xác' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Xác thực quản trị viên thành công' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

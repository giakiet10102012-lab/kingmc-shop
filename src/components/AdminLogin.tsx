'use client';

import React, { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLoginProps {
  onLogin: (pin: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });

      if (res.ok) {
        onLogin(pin.trim());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Mã PIN không chính xác.');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel - KingMC Shop</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Nhập mã PIN để truy cập quản trị hệ thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mật khẩu quản trị (Mặc định: kietgottop2)"
                className="block w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] py-3 pl-11 pr-4 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                required
                autoFocus
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
            <p className="mt-2 text-xs text-zinc-500">Mật khẩu mặc định: <code>kietgottop2</code> (hoặc cấu hình biến <code>ADMIN_PIN</code>)</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-all hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] shadow-[0_0_15px_rgba(16,185,129,0.3)]",
              isLoading && "opacity-70 cursor-not-allowed"
            )}
          >
            {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập Quản Trị'}
          </button>
        </form>
      </div>
    </div>
  );
}

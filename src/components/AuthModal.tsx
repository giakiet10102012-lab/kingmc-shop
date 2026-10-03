'use client';

import React, { useState } from 'react';
import { X, User, Lock, UserPlus, LogIn, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { loginUser, registerUser, UserProfile } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  defaultMode?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Mật khẩu nhập lại không khớp!');
        setLoading(false);
        return;
      }
      const res = registerUser(username, password);
      setLoading(false);
      if (res.success && res.user) {
        setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'Đăng ký không thành công.');
      }
    } else {
      const res = loginUser(username, password);
      setLoading(false);
      if (res.success && res.user) {
        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Đăng nhập không thành công.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 sm:p-8 shadow-2xl z-10 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-2 text-zinc-400 hover:bg-[#1e1e2e] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {mode === 'login' ? <LogIn size={26} /> : <UserPlus size={26} />}
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            {mode === 'login' 
              ? 'Đăng nhập để tự động điền IGN và xem lịch sử đơn hàng' 
              : 'Tạo tài khoản KingMC để nhận ưu đãi và quản lý giao dịch'}
          </p>
        </div>

        {/* Tabs: Đăng nhập / Đăng ký */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#0a0a0f] p-1 border border-[#1e1e2e]">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={cn(
              "py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all",
              mode === 'login' 
                ? "bg-emerald-500 text-white shadow-lg" 
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={cn(
              "py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all",
              mode === 'register' 
                ? "bg-emerald-500 text-white shadow-lg" 
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Đăng Ký
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
            <ShieldAlert size={18} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              Tên tài khoản / Nick Minecraft (IGN)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: Steve, Notch, Giakiet..."
                className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu vừa nhập"
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 transition-all",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản')}
          </button>
        </form>

        {/* Switch mode hint */}
        <div className="mt-5 text-center text-xs text-zinc-400">
          {mode === 'login' ? (
            <p>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="font-bold text-emerald-400 hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="font-bold text-emerald-400 hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

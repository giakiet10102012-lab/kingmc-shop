"use client";

import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Discord OAuth Login
  const handleDiscordLogin = async () => {
    try {
      setDiscordLoading(true);
      setError(null);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: origin,
        },
      });

      if (error) {
        setError(error.message || 'Lỗi khi kết nối Discord');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể mở đăng nhập Discord');
    } finally {
      setDiscordLoading(false);
    }
  };

  // Handle Email & Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setSuccessMsg('Đăng nhập thành công!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 800);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setSuccessMsg('Đăng ký tài khoản thành công!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 800);
        } else {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận (nếu có yêu cầu xác thực).');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Đã có lỗi xảy ra';
      if (message.includes('Invalid login credentials')) {
        message = 'Email hoặc mật khẩu không chính xác!';
      } else if (message.includes('User already registered')) {
        message = 'Email này đã được đăng ký. Vui lòng đăng nhập!';
      } else if (message.includes('Password should be at least')) {
        message = 'Mật khẩu phải có tối thiểu 6 ký tự!';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md rounded-3xl border border-[#1e1e2e] bg-[#12121a] p-6 sm:p-8 shadow-2xl text-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 rounded-full bg-[#5865F2]/10 blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-black tracking-tight text-white">
            {mode === 'signin' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
          </h2>
          <p className="text-xs text-zinc-400">
            {mode === 'signin' 
              ? 'Đăng nhập để theo dõi lịch sử nạp Money và chat ticket hỗ trợ'
              : 'Đăng ký nhanh để quản lý tất cả đơn hàng đã mua trên KingMC Shop'}
          </p>
        </div>

        {/* 1-Click Discord Login Button */}
        <div className="space-y-4 mb-6">
          <button
            type="button"
            onClick={handleDiscordLogin}
            disabled={discordLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm shadow-[0_0_20px_rgba(88,101,242,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {discordLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            )}
            <span>{mode === 'signin' ? 'Đăng nhập với Discord' : 'Đăng ký với Discord'}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#1e1e2e] w-full"></div>
            <span className="bg-[#12121a] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold shrink-0">
              Hoặc dùng Email
            </span>
            <div className="border-t border-[#1e1e2e] w-full"></div>
          </div>
        </div>

        {/* Tab switcher: Sign in / Sign up */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] mb-5">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signin' 
                ? 'bg-emerald-500 text-black shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signup' 
                ? 'bg-emerald-500 text-black shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500/60 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Mật khẩu {mode === 'signup' && <span className="text-zinc-500 font-normal">(tối thiểu 6 ký tự)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500/60 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || discordLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a0a0f] font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn size={18} />
                <span>ĐĂNG NHẬP</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>ĐĂNG KÝ TÀI KHOẢN</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

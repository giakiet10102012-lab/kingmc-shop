'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPin = async () => {
      const storedPin = localStorage.getItem('admin_pin');
      if (storedPin) {
        try {
          const res = await fetch('/api/orders?status=all', {
            headers: { 'x-admin-pin': storedPin }
          });
          if (res.ok) {
            setAdminPin(storedPin);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('admin_pin');
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsChecking(false);
    };
    checkPin();
  }, []);

  const handleLogin = (pin: string) => {
    localStorage.setItem('admin_pin', pin);
    setAdminPin(pin);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_pin');
    setAdminPin(null);
    setIsAuthenticated(false);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-zinc-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
      </div>
    );
  }

  if (!isAuthenticated || !adminPin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">KingMC</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  Control Center
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">Trung tâm quản lý hệ thống & đơn hàng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] bg-[#12121a] px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
            >
              <ExternalLink size={15} />
              <span>Xem Shop</span>
            </Link>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs sm:text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main>
        <AdminDashboard pin={adminPin} />
      </main>
    </div>
  );
}

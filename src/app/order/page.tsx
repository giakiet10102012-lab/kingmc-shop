'use client';

import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !adminPin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">KingMC <span className="text-emerald-500">Admin</span></span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main>
        <AdminDashboard pin={adminPin} />
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Loader2, ShieldAlert, CheckCircle2, Clock, Crown, User, RefreshCw } from 'lucide-react';
import { Order, OrderMessage } from '@/lib/types';
import { formatVND, getStatusColor, getStatusLabel } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface OrderTicketModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  adminPin?: string;
}

export default function OrderTicketModal({
  order,
  isOpen,
  onClose,
  isAdmin = false,
  adminPin = ''
}: OrderTicketModalProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages from API
  const fetchMessages = async (silent = false) => {
    if (!order) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/messages?order_id=${order.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Fetch ticket messages error:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && order) {
      fetchMessages();

      // Poll every 3 seconds for new messages
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 3000);

      // Realtime subscription if available
      let channel: any = null;
      if (isSupabaseConfigured()) {
        try {
          channel = supabase
            .channel(`order_messages_${order.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${order.id}`,
              },
              (payload) => {
                if (payload.new) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as OrderMessage];
                  });
                  setTimeout(scrollToBottom, 100);
                }
              }
            )
            .subscribe();
        } catch {}
      }

      return () => {
        clearInterval(interval);
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [isOpen, order?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen || !order) return null;

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (isAdmin && adminPin) {
        headers['x-admin-pin'] = adminPin.trim();
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: order.id,
          sender: isAdmin ? 'admin' : 'customer',
          sender_name: isAdmin ? 'Admin KingMC' : order.ign,
          message: textToSend,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(scrollToBottom, 100);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Lỗi gửi tin nhắn');
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-3xl border border-[#1e1e2e] bg-[#12121a] shadow-2xl text-zinc-100 flex flex-col h-[85vh] max-h-[720px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[#1e1e2e] p-4 sm:p-5 bg-gradient-to-r from-[#161622] via-[#12121a] to-[#161622] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Ticket Đơn #{order.id}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Nhân vật: <strong className="text-emerald-400 font-mono">{order.ign}</strong> • Mua: <strong>{order.money_m}M</strong> ({formatVND(order.total_vnd)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMessages(false)}
              title="Làm mới tin nhắn"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="bg-[#0a0a0f] border-b border-[#1e1e2e] px-4 py-2 text-[11px] text-zinc-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Hỗ trợ trực tiếp 1-1 giữa Khách & Admin
          </span>
          <span className="text-zinc-500">Mã đơn: {order.id}</span>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e0e14]">
          {/* Welcome Message */}
          <div className="flex justify-center my-2">
            <div className="max-w-md rounded-2xl bg-[#161622] border border-[#1e1e2e] p-3 text-center text-xs text-zinc-400 space-y-1">
              <p className="font-bold text-zinc-300">
                👋 Chào {order.ign}! Đây là Ticket hỗ trợ riêng cho đơn hàng này.
              </p>
              <p className="text-[11px] text-zinc-500">
                Sau khi chuyển tiền, bạn có thể nhắn tin báo Admin hoặc gửi link ảnh chuyển khoản tại đây để được kiểm tra và duyệt nhanh nhất!
              </p>
            </div>
          </div>

          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Đang tải tin nhắn...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs">
              Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên bên dưới!
            </div>
          ) : (
            messages.map((msg) => {
              const isMsgAdmin = msg.sender === 'admin';
              const isCurrentUser = isAdmin ? isMsgAdmin : !isMsgAdmin;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isMsgAdmin ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Crown size={12} />
                        Admin KingMC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                        <User size={12} />
                        {msg.sender_name || order.ign}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm break-words leading-relaxed shadow-md ${
                      isCurrentUser
                        ? 'bg-emerald-500 text-black font-medium rounded-tr-none'
                        : isMsgAdmin
                        ? 'bg-[#1e1b2e] text-zinc-100 border border-purple-500/30 rounded-tl-none'
                        : 'bg-[#1a1a26] text-zinc-200 border border-[#2a2a3e] rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-[#1e1e2e] p-3 sm:p-4 bg-[#12121a] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isAdmin 
                ? "Trả lời với tư cách Admin KingMC..." 
                : "Nhắn tin cho Admin (VD: Đã chuyển tiền, check giúp mình)..."
            }
            className="flex-1 bg-[#0a0a0f] border border-[#1e1e2e] focus:border-emerald-500/60 rounded-xl px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send size={15} />
                <span className="hidden sm:inline">Gửi</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

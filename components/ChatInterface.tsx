'use client';

/**
 * GYEOL 채팅 UI — Void 위 오버레이, 메시지 리스트 + 입력 바
 */

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { VoiceInput } from './VoiceInput';
import type { Message } from '@/lib/gyeol/types';

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-[#1A1A2E] text-white'
            : 'bg-transparent border border-indigo-500/20 text-[#E5E5E5] shadow-[0_0_20px_rgba(79,70,229,0.15)]'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
    </motion.div>
  );
}

export function ChatInterface() {
  const {
    agent,
    messages,
    isLoading,
    error,
    setError,
    sendMessage,
    isListening,
  } = useGyeolStore();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !agent?.id) return;
    setInput('');
    await sendMessage(text);
  };

  const handleVoiceResult = (text: string) => {
    if (text.trim()) setInput((prev) => (prev ? prev + ' ' + text : text));
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none" role="region" aria-label="Chat">
      <div className="pointer-events-auto flex flex-col h-full max-h-[100dvh]">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-3 min-h-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          role="log" aria-label="Messages" aria-live="polite"
        >
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 text-sm"
              >
                {error.message} (dismiss)
              </button>
            </motion.div>
          )}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl border border-indigo-500/20 px-4 py-2.5 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-2 rounded-2xl bg-[#111] border border-white/5 px-3 py-2">
            <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask me anything..."
              aria-label="Message input"
              className="flex-1 bg-transparent text-[#E5E5E5] placeholder:text-gray-500 text-sm py-2 outline-none min-w-0 focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="rounded-full p-2 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-40 disabled:pointer-events-none transition focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


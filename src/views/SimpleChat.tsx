import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { VoiceInput } from '@/components/VoiceInput';
import { EvolutionCeremony } from '@/src/components/evolution/EvolutionCeremony';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SimpleChat() {
  const navigate = useNavigate();
  const { agent } = useInitAgent();
  const { messages, sendMessage, isLoading, error, setError, lastReaction, addMessage } = useGyeolStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settings = (agent?.settings as any) ?? {};
  const fontSize = settings.fontSize ?? 18;
  const autoTTS = settings.autoTTS !== false;
  const hasCharacter = settings.characterPreset != null;

  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!agent?.id) return;
    const channel = supabase
      .channel(`simple-proactive-${agent.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'gyeol_conversations',
        filter: `agent_id=eq.${agent.id}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.role === 'assistant') {
          const exists = useGyeolStore.getState().messages.some((m: any) => m.id === row.id);
          if (!exists) {
            addMessage(row);
            if (autoTTS) speakText(row.content, settings.readSpeed ?? 0.95);
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent?.id, autoTTS]);

  useEffect(() => {
    if (!autoTTS || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant') {
      speakText(last.content, settings.readSpeed ?? 0.95);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !agent?.id) return;
    setInput('');
    stopSpeaking();
    await sendMessage(text);
  };

  const agentName = agent?.name ?? 'GYEOL';

  return (
    <main className="flex flex-col h-[100dvh] bg-background overflow-hidden relative">
      <div className="aurora-bg" />

      {/* === Header === */}
      {hasCharacter ? (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative z-10"
          style={{ height: '30vh' }}>
          <button onClick={() => navigate('/settings')}
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center glass-card">
            <span className="material-icons-round text-lg text-muted-foreground">settings</span>
          </button>
          <AnimatedCharacter
            mood={(agent as any)?.mood ?? 'neutral'}
            isThinking={isLoading}
            reaction={lastReaction}
            characterPreset={settings.characterPreset}
            skinId={(agent as any)?.skin_id}
            gen={agent?.gen ?? 1}
            size="lg"
          />
          <div className="mt-2 flex items-center gap-2">
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <p className="text-[10px] text-emerald-400/70 mt-0.5">Online</p>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass-panel z-10 relative">
          <div className="flex items-center gap-2">
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <button onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card">
            <span className="material-icons-round text-lg text-muted-foreground">settings</span>
          </button>
        </div>
      )}

      {/* === Messages === */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 relative z-10">
        {/* Date separator */}
        {messages.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-slate-400">
              Today, {format(new Date(), 'h:mm a')}
            </span>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="flex gap-2.5 justify-end">
                <div className="max-w-[80%]">
                  <span className="text-[10px] text-slate-400 font-medium mr-1 mb-1 block text-right">You</span>
                  <div className="user-bubble p-4 rounded-2xl rounded-br-sm"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                  <span className="material-icons-round text-slate-300 text-[14px]">person</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                  <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
                </div>
                <div className="max-w-[80%]">
                  <span className="text-[10px] text-primary/60 font-medium ml-1 mb-1 block">{agentName}</span>
                  <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                    <div className="prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator with avatar */}
        {isLoading && (
          <div className="flex gap-2.5 mb-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center">
              <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
            </div>
            <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-end gap-1 h-4">
                <div className="typing-bar" />
                <div className="typing-bar" />
                <div className="typing-bar" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center py-2">
            <button onClick={() => setError(null)}
              className="text-xs text-red-400/70">{error.message}</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* === Input bar === */}
      <div className="flex-shrink-0 relative z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        <div className="bg-gradient-to-t from-background to-transparent pt-6 px-4">
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
              <span className="material-icons-round text-[20px]">add_circle_outline</span>
            </button>
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message GYEOL..."
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-slate-500" />
            <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
            {input.trim() && (
              <button onClick={handleSend} disabled={isLoading}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center flex-shrink-0 transition-all">
                <span className="material-icons-round text-white text-base">arrow_upward</span>
              </button>
            )}
          </div>
          <p className="text-center text-[9px] text-slate-600 mt-1.5">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      <EvolutionCeremony />
    </main>
  );
}

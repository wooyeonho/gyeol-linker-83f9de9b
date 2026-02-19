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

  // System theme
  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Proactive message realtime
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

  // Auto TTS
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

  // Theme colors
  const bg = isDark ? 'bg-black' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-white/40' : 'text-gray-400';
  const myBubble = isDark ? 'bg-primary/20 text-white' : 'bg-blue-100 text-gray-900';
  const aiBubble = isDark ? 'bg-white/[0.06] text-white/90' : 'bg-gray-100 text-gray-900';
  const inputBg = isDark ? 'bg-white/[0.06]' : 'bg-gray-100';
  const border = isDark ? 'border-white/[0.04]' : 'border-gray-200';

  return (
    <main className={`flex flex-col h-[100dvh] ${bg} overflow-hidden`}>

      {/* === Header === */}
      {hasCharacter ? (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative"
          style={{ height: '30vh' }}>
          <button onClick={() => navigate('/settings')}
            className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center ${inputBg}`}>
            <span className={`material-icons-round text-lg ${sub}`}>settings</span>
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
          <p className={`mt-2 text-base font-medium ${text}`}>{agent?.name ?? 'GYEOL'}</p>
        </div>
      ) : (
        <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 ${border} border-b`}>
          <p className={`text-base font-medium ${text}`}>{agent?.name ?? 'GYEOL'}</p>
          <button onClick={() => navigate('/settings')}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${inputBg}`}>
            <span className={`material-icons-round text-lg ${sub}`}>settings</span>
          </button>
        </div>
      )}

      {/* === Messages === */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.map(msg => (
          <div key={msg.id}
            className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? myBubble : aiBubble}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className={`px-4 py-3 rounded-2xl ${aiBubble} flex gap-1`}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-current opacity-40"
                  animate={{ opacity: [0.2, 0.8, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
              ))}
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
      <div className={`flex-shrink-0 px-4 pt-2 pb-4 ${border} border-t`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${inputBg}`}>
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="..."
            style={{ fontSize: '16px' }}
            className={`flex-1 bg-transparent outline-none min-w-0 ${text}`} />
          {input.trim() ? (
            <button onClick={handleSend} disabled={isLoading}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="material-icons-round text-white text-lg">arrow_upward</span>
            </button>
          ) : (
            <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
          )}
        </div>
      </div>

      <EvolutionCeremony />
    </main>
  );
}

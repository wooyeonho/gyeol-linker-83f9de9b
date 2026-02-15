import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TopNav } from '@/src/components/TopNav';
import { PearlSpheres } from '@/src/components/PearlSpheres';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { VoiceInput } from '@/components/VoiceInput';
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
            ? 'bg-primary text-primary-foreground'
            : 'section-card'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
    </motion.div>
  );
}

export default function GyeolPage() {
  const { subscribeToUpdates, isLoading, isListening, messages, error, setError, sendMessage } = useGyeolStore();
  const { agent, loading: agentLoading } = useInitAgent();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!agent?.id) return;
    const unsub = subscribeToUpdates(agent.id);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [agent?.id, subscribeToUpdates]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !agent?.id) return;
    setInput('');
    if (!chatOpen) setChatOpen(true);
    await sendMessage(text);
  };

  const handleVoiceResult = (text: string) => {
    if (text.trim()) setInput((prev) => (prev ? prev + ' ' + text : text));
  };

  const personality = agent
    ? { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor }
    : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

  if (agentLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading GYEOL...</div>
      </main>
    );
  }

  const greeting = getGreeting();

  return (
    <main className="flex-grow flex flex-col items-center relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-32 min-h-screen bg-background font-display overflow-x-hidden selection:bg-primary/30 selection:text-primary transition-colors duration-300">
      <TopNav />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-400/5 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Top/Bottom fades — below chat overlay */}
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-30" />
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-30" />

      {/* Pearl Spheres */}
      <div className="mb-8 flex items-center justify-center">
        <PearlSpheres personality={personality} isThinking={isLoading} />
      </div>

      {/* Greeting */}
      <div className="text-center z-30 mb-8 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-foreground">
          {greeting}, {user?.email?.split('@')[0] ?? 'Explorer'}
        </h1>
        <p className="text-muted-foreground font-medium">
          OpenClaw Core Active
        </p>
      </div>

      {/* Status Card */}
      <div className="w-full max-w-lg mb-12 z-30">
        <div className="status-card rounded-2xl p-6 shadow-card flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(142,71%,45%,0.1)] flex items-center justify-center relative">
              <span className="material-icons-round text-[hsl(142,71%,45%)] text-2xl">power_settings_new</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">System Status</span>
              <span className="text-lg font-bold text-foreground">Online (OpenClaw)</span>
            </div>
          </div>
          <Link to="/activity" className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground">
            <span className="material-icons-round">chevron_right</span>
          </Link>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-12 z-30 px-2">
        <Link to="/activity" className="section-card p-6 text-left hover:-translate-y-1 transition-all duration-300 shadow-sm group block">
          <div className="w-12 h-12 rounded-xl bg-[hsl(215,83%,93%)] dark:bg-[hsl(215,50%,20%,0.3)] text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">monitoring</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Daily Evolution</h3>
          <p className="text-sm text-muted-foreground">Check growth metrics</p>
        </Link>
        <Link to="/social" className="section-card p-6 text-left hover:-translate-y-1 transition-all duration-300 shadow-sm group block">
          <div className="w-12 h-12 rounded-xl bg-[hsl(270,60%,93%)] dark:bg-[hsl(270,50%,20%,0.3)] text-[hsl(270,60%,50%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">shield</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Safety Audit</h3>
          <p className="text-sm text-muted-foreground">Review core protocols</p>
        </Link>
        <Link to="/market/skills" className="section-card p-6 text-left hover:-translate-y-1 transition-all duration-300 shadow-sm group block">
          <div className="w-12 h-12 rounded-xl bg-[hsl(30,80%,93%)] dark:bg-[hsl(30,50%,20%,0.3)] text-[hsl(30,80%,50%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">extension</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">New Skills</h3>
          <p className="text-sm text-muted-foreground">Explore capabilities</p>
        </Link>
      </div>

      {/* Chat Messages Overlay */}
      <AnimatePresence>
        {chatOpen && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-28 top-20 z-[60] flex flex-col px-4"
          >
            <div className="flex-1 max-w-2xl mx-auto w-full overflow-y-auto space-y-3 py-4 gyeol-scrollbar-hide">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <button type="button" onClick={() => setError(null)}
                    className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 text-sm">
                    {error.message} (dismiss)
                  </button>
                </motion.div>
              )}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="section-card rounded-2xl px-4 py-2.5 flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </motion.div>
              )}
            </div>
            {/* Close chat */}
            <button
              onClick={() => setChatOpen(false)}
              className="mx-auto mb-2 text-xs text-muted-foreground hover:text-foreground transition px-4 py-1 rounded-full glass-panel"
            >
              Close Chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Input */}
      <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center z-50">
        <div className="w-full max-w-2xl relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="relative flex items-center glass-panel rounded-full p-2 shadow-glass transition-shadow duration-300 focus-within:shadow-glow-soft bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10">
            <div className="pl-4 pr-1 flex items-center gap-2 text-muted-foreground">
              <span className="material-icons-round text-xl">search</span>
              <span className="material-icons-round text-xl">pets</span>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              onFocus={() => messages.length > 0 && setChatOpen(true)}
              placeholder="Ask OpenClaw anything..."
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground text-lg py-3 px-2 font-medium"
            />
            <div className="flex items-center gap-2 pr-2">
              <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              >
                <span className="material-icons-round text-xl">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <EvolutionCeremony />
    </main>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

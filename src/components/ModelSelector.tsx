import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Brain, Sparkles } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  icon: React.ReactNode;
  speed: string;
  quality: string;
  cost: string;
  recommended?: boolean;
}

const MODELS: Model[] = [
  { id: 'lovable', name: 'Lovable AI', icon: <Sparkles className="w-3.5 h-3.5" />, speed: 'Fast', quality: 'High', cost: 'Free', recommended: true },
  { id: 'groq', name: 'Groq (BYOK)', icon: <Zap className="w-3.5 h-3.5" />, speed: 'Very Fast', quality: 'High', cost: 'BYOK' },
];

interface Props {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ currentModel, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = MODELS.find(m => m.id === currentModel) ?? MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-[10px] font-medium text-foreground/80 hover:text-foreground transition"
      >
        {selected.icon}
        <span>{selected.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute top-full mt-1 left-0 z-50 w-56 glass-card rounded-xl p-1.5 shadow-xl"
          >
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                  currentModel === m.id ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted/20'
                }`}
              >
                {m.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium">{m.name}</span>
                    {m.recommended && (
                      <span className="text-[7px] px-1 py-0.5 rounded-full bg-primary/20 text-primary">추천</span>
                    )}
                  </div>
                  <span className="text-[8px] text-muted-foreground">{m.speed} · {m.quality} · {m.cost}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProviderComparison() {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Brain className="w-3.5 h-3.5 text-primary" />
        Provider Comparison
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border/20">
              <th className="text-left py-1.5 pr-2">Model</th>
              <th className="text-center py-1.5 px-2">Speed</th>
              <th className="text-center py-1.5 px-2">Quality</th>
              <th className="text-center py-1.5 px-2">Cost</th>
              <th className="text-center py-1.5 pl-2"></th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map(m => (
              <tr key={m.id} className="border-b border-border/10">
                <td className="py-2 pr-2 font-medium text-foreground/80">{m.name}</td>
                <td className="py-2 px-2 text-center text-foreground/60">{m.speed}</td>
                <td className="py-2 px-2 text-center text-foreground/60">{m.quality}</td>
                <td className="py-2 px-2 text-center text-foreground/60">{m.cost}</td>
                <td className="py-2 pl-2 text-center">
                  {m.recommended && <span className="text-primary">⭐</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ApiUsageDashboard({ agentId }: { agentId?: string }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mockData = [120, 340, 250, 180, 400, 150, 90];
  const maxVal = Math.max(...mockData, 1);

  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" />
        API Usage (This Week)
      </h4>
      <div className="flex items-end gap-1 h-20">
        {mockData.map((val, i) => (
          <div key={days[i]} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(val / maxVal) * 100}%` }}
              transition={{ delay: i * 0.05 }}
              className="w-full rounded-t-sm bg-primary/30 min-h-[2px]"
            />
            <span className="text-[7px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>Total: {mockData.reduce((a, b) => a + b, 0).toLocaleString()} tokens</span>
        <span>Avg: {Math.round(mockData.reduce((a, b) => a + b, 0) / 7).toLocaleString()}/day</span>
      </div>
    </div>
  );
}

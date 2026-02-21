import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, Upload, BarChart3, Share2, ArrowLeftRight, Lock, RotateCcw, Star } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import type { Agent } from '@/lib/gyeol/types';

interface Props {
  agents: Agent[];
  currentAgentId?: string;
  onSwitch: (agentId: string) => void;
  onCreateNew: () => void;
}

export function AgentListPanel({ agents, currentAgentId, onSwitch, onCreateNew }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-foreground">My Agents</h3>
        <button onClick={onCreateNew}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-medium hover:bg-primary/20 transition">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>
      {agents.map(agent => (
        <motion.button
          key={agent.id}
          onClick={() => onSwitch(agent.id)}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
            agent.id === currentAgentId ? 'bg-primary/10 border border-primary/20' : 'glass-card hover:bg-muted/20'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">Gen {agent.gen}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-medium text-foreground truncate">{agent.name}</p>
            <p className="text-[9px] text-muted-foreground">Gen {agent.gen} · {agent.mood}</p>
          </div>
          {agent.id === currentAgentId && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </motion.button>
      ))}
    </div>
  );
}

export function AgentBackupRestore({ agent }: { agent: Agent }) {
  const [importing, setImporting] = useState(false);

  const handleBackup = () => {
    const data = {
      name: agent.name,
      gen: agent.gen,
      warmth: agent.warmth,
      logic: agent.logic,
      creativity: agent.creativity,
      energy: agent.energy,
      humor: agent.humor,
      visual_state: agent.visual_state,
      settings: agent.settings,
      mood: agent.mood,
      intimacy: agent.intimacy,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyeol_backup_${agent.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await supabase.from('gyeol_agents' as any).update({
        warmth: data.warmth,
        logic: data.logic,
        creativity: data.creativity,
        energy: data.energy,
        humor: data.humor,
        visual_state: data.visual_state,
        settings: data.settings,
      } as any).eq('id', agent.id);
    } catch (err) {
      console.error('Restore failed:', err);
    }
    setImporting(false);
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleBackup}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl glass-card text-[10px] text-foreground/70 hover:text-foreground transition">
        <Download className="w-3.5 h-3.5" /> Backup
      </button>
      <label className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl glass-card text-[10px] text-foreground/70 hover:text-foreground transition cursor-pointer">
        <Upload className="w-3.5 h-3.5" /> {importing ? 'Restoring...' : 'Restore'}
        <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
      </label>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Heart, Search, Hash, AtSign, Bell, Filter, Trophy, MessageCircle, Eye, Share2, Link2, QrCode, Globe, Clock, Users, Bookmark, TrendingUp } from 'lucide-react';

export function MatchingRecommendations({ matches }: { matches: { name: string; compatibility: number; gen: number; traits: string[] }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5 text-pink-400" /> Recommended Matches
      </h4>
      {matches.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="p-3 rounded-xl glass-card space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400/30 to-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {m.compatibility}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-foreground truncate">{m.name}</p>
              <p className="text-[8px] text-muted-foreground">Gen {m.gen}</p>
            </div>
            <button className="px-2 py-1 rounded-full bg-pink-400/10 text-pink-400 text-[9px] font-medium hover:bg-pink-400/20 transition">
              <UserPlus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {m.traits.map(t => (
              <span key={t} className="text-[7px] px-1.5 py-0.5 rounded-full bg-muted/10 text-muted-foreground">{t}</span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function MatchingHistory({ history }: { history: { name: string; date: string; status: string }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground">Match History</h4>
      {history.map((h, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
          <span className="text-foreground/70 flex-1 truncate">{h.name}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${
            h.status === 'matched' ? 'bg-primary/10 text-primary' : 'bg-muted/10 text-muted-foreground'
          }`}>{h.status}</span>
          <span className="text-muted-foreground/40">{h.date}</span>
        </div>
      ))}
    </div>
  );
}

export function GeneticPreview({ parentA, parentB }: {
  parentA: { name: string; traits: Record<string, number> };
  parentB: { name: string; traits: Record<string, number> };
}) {
  const traits = ['warmth', 'logic', 'creativity', 'energy', 'humor'];
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Genetic Preview</h4>
      {traits.map(trait => {
        const avg = Math.round(((parentA.traits[trait] ?? 50) + (parentB.traits[trait] ?? 50)) / 2);
        const variance = Math.abs((parentA.traits[trait] ?? 50) - (parentB.traits[trait] ?? 50));
        return (
          <div key={trait} className="space-y-0.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-foreground/60 capitalize">{trait}</span>
              <span className="text-primary">{avg} ±{Math.round(variance / 4)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/20 relative">
              <div className="h-full rounded-full bg-primary/40" style={{ width: `${avg}%` }} />
              <div className="absolute h-full rounded-full bg-primary/20"
                style={{ left: `${Math.max(0, avg - variance / 4)}%`, width: `${variance / 2}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FamilyTree({ tree }: { tree: { name: string; gen: number; children?: any[] }[] }) {
  const renderNode = (node: any, depth: number) => (
    <div key={node.name} className={`${depth > 0 ? 'ml-4 border-l border-border/20 pl-2' : ''}`}>
      <div className="flex items-center gap-1.5 py-1">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
          depth === 0 ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground'
        }`}>G{node.gen}</div>
        <span className="text-[10px] text-foreground/70">{node.name}</span>
      </div>
      {node.children?.map((c: any) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-bold text-foreground">Family Tree</h4>
      {tree.map(node => renderNode(node, 0))}
    </div>
  );
}

export function MoltbookPost({ post, onLike, onComment, onShare }: {
  post: { author: string; content: string; media?: string; hashtags: string[]; mentions: string[]; likes: number; comments: number; time: string };
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
          <Users className="w-3 h-3 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium text-foreground">{post.author}</p>
          <p className="text-[8px] text-muted-foreground">{post.time}</p>
        </div>
      </div>
      <p className="text-[10px] text-foreground/80 leading-relaxed">{post.content}</p>
      {post.media && (
        <img src={post.media} alt="" className="w-full rounded-xl object-cover max-h-48" loading="lazy" />
      )}
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.hashtags.map(h => (
            <span key={h} className="text-[8px] text-primary/60">#{h}</span>
          ))}
        </div>
      )}
      {post.mentions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.mentions.map(m => (
            <span key={m} className="text-[8px] text-secondary/60">@{m}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 pt-1 border-t border-border/10">
        <button onClick={onLike} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-pink-400 transition">
          <Heart className="w-3 h-3" /> {post.likes}
        </button>
        <button onClick={onComment} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition">
          <MessageCircle className="w-3 h-3" /> {post.comments}
        </button>
        <button onClick={onShare} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition">
          <Share2 className="w-3 h-3" /> Share
        </button>
      </div>
    </div>
  );
}

export function MoltbookSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
      <input type="text" value={query} onChange={e => { setQuery(e.target.value); onSearch(e.target.value); }}
        placeholder="Search Moltbook..."
        className="w-full bg-muted/10 border border-border/20 rounded-xl pl-8 pr-3 py-2 text-[10px] text-foreground outline-none" />
    </div>
  );
}

export function CommunityEventCard({ event }: { event: { title: string; description: string; participants: number; endsAt: string } }) {
  return (
    <div className="p-3 rounded-xl glass-card border border-primary/20 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">🎉</span>
        <p className="text-[10px] font-bold text-foreground">{event.title}</p>
      </div>
      <p className="text-[9px] text-muted-foreground">{event.description}</p>
      <div className="flex items-center gap-3 text-[8px] text-muted-foreground/60">
        <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {event.participants}</span>
        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Ends: {event.endsAt}</span>
      </div>
    </div>
  );
}

export function AIConversationSpectator({ conversation }: { conversation: { agentA: string; agentB: string; messages: { from: string; text: string }[] } }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold text-foreground">
          {conversation.agentA} × {conversation.agentB}
        </span>
      </div>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {conversation.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === conversation.agentA ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-2 rounded-xl text-[9px] ${
              msg.from === conversation.agentA ? 'glass-card' : 'bg-primary/10'
            }`}>
              <span className="text-[8px] text-muted-foreground block mb-0.5">{msg.from}</span>
              <span className="text-foreground/80">{msg.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentShareLink({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/agent/${agentId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Share {agentName}</h4>
      <div className="flex gap-1">
        <input type="text" readOnly value={shareUrl}
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[9px] text-foreground/60 font-mono outline-none" />
        <button onClick={copyLink}
          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[9px]">
          <Link2 className="w-3 h-3" /> {copied ? '✓' : ''}
        </button>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl glass-card text-[9px] text-foreground/60 hover:text-foreground transition">
          <QrCode className="w-3 h-3" /> QR Code
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl glass-card text-[9px] text-foreground/60 hover:text-foreground transition">
          <Globe className="w-3 h-3" /> SNS
        </button>
      </div>
    </div>
  );
}

export function ProfilePublicPage({ agent, stats }: {
  agent: { name: string; gen: number; mood: string; intimacy: number };
  stats: { conversations: number; followers: number; achievements: number };
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">G{agent.gen}</span>
        </div>
        <h2 className="text-base font-bold text-foreground">{agent.name}</h2>
        <p className="text-[10px] text-muted-foreground">Gen {agent.gen} · {agent.mood}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Chats', value: stats.conversations },
          { label: 'Followers', value: stats.followers },
          { label: 'Achievements', value: stats.achievements },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-xl glass-card">
            <p className="text-[12px] font-bold text-primary">{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
      <input type="text" value={query} onChange={e => { setQuery(e.target.value); onSearch(e.target.value); }}
        placeholder="Search profiles..."
        className="w-full bg-muted/10 border border-border/20 rounded-xl pl-8 pr-3 py-2 text-[10px] text-foreground outline-none" />
    </div>
  );
}

export function ProfileComparison({ agentA, agentB }: {
  agentA: { name: string; warmth: number; logic: number; creativity: number; energy: number; humor: number };
  agentB: { name: string; warmth: number; logic: number; creativity: number; energy: number; humor: number };
}) {
  const traits = ['warmth', 'logic', 'creativity', 'energy', 'humor'] as const;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="text-primary">{agentA.name}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="text-secondary">{agentB.name}</span>
      </div>
      {traits.map(t => (
        <div key={t} className="space-y-0.5">
          <div className="flex justify-between text-[8px] text-muted-foreground capitalize">
            <span>{agentA[t]}</span>
            <span>{t}</span>
            <span>{agentB[t]}</span>
          </div>
          <div className="flex h-1.5 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full bg-primary/60 rounded-l-full" style={{ width: `${agentA[t] / 2}%` }} />
            <div className="flex-1" />
            <div className="h-full bg-secondary/60 rounded-r-full" style={{ width: `${agentB[t] / 2}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

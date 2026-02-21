import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

const ANALYSIS_DOMAINS = [
  { key: 'crypto', icon: 'currency_bitcoin', label: 'Cryptocurrency', desc: 'CDD, CVDD, MVRV, NUPL, Fear & Greed' },
  { key: 'stocks', icon: 'trending_up', label: 'Stocks', desc: 'PER, PBR, ROE, RSI, VIX' },
  { key: 'forex', icon: 'currency_exchange', label: 'Forex (FX)', desc: 'DXY, Carry trade, PPP, REER' },
  { key: 'commodities', icon: 'oil_barrel', label: 'Commodities', desc: 'Gold/Silver ratio, Contango, WTI, CFTC' },
  { key: 'macro', icon: 'account_balance', label: 'Macro / Bonds', desc: 'Yield curve, CPI, PMI, M2' },
  { key: 'academic', icon: 'school', label: 'Academic', desc: 'arXiv, PubMed paper analysis' },
] as const;

interface Props {
  agent: any;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  analysisDomains: Record<string, boolean>;
  setAnalysisDomains: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function AnalysisDomainSection({ agent, activeSection, SectionHeader, analysisDomains, setAnalysisDomains }: Props) {
  return (
    <section>
      <SectionHeader id="analysis" icon="analytics" title="Analysis Domains" />
      <AnimatePresence>
        {activeSection === 'analysis' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
            <p className="text-[10px] text-foreground/25 leading-relaxed">
              Enable domains for specialized analysis during conversations.
            </p>
            <div className="space-y-2">
              {ANALYSIS_DOMAINS.map(d => {
                const enabled = analysisDomains[d.key] ?? false;
                return (
                  <div key={d.key} className="flex items-center justify-between rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-icons-round text-primary/40 text-sm">{d.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-foreground/70">{d.label}</p>
                        <p className="text-[9px] text-foreground/20 truncate">{d.desc}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      const next = { ...analysisDomains, [d.key]: !enabled };
                      setAnalysisDomains(next);
                      if (agent) supabase.from('gyeol_agents' as any)
                        .update({ settings: { ...(agent as any).settings, analysisDomains: next } } as any)
                        .eq('id', agent.id);
                    }}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`}>
                      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${enabled ? 'ml-[18px]' : 'ml-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

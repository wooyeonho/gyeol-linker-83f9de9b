import type { SupabaseClient } from '@supabase/supabase-js';
import type { SkillContext, SkillResult, HeartbeatResult, SkillId } from './types';
import { runLearnRss } from './skills/learn-rss';
import { runSelfReflect } from './skills/self-reflect';
import { runProactiveMessage } from './skills/proactive-message';
import { runWebBrowse } from './skills/web-browse';
import { runMoltbookSocial } from './skills/moltbook-social';
import { runMoltMatch } from './skills/moltmatch';
import { runAIConversation } from './skills/ai-conversation';
import { runCommunityActivity } from './skills/community-activity';
import { checkKillSwitch } from '../security/kill-switch-check';
import { detectAnomaly } from '../security/audit-logger';
import { decryptKey } from '../byok';

const SKILL_RUNNERS: Record<SkillId, (ctx: SkillContext) => Promise<SkillResult>> = {
  'learn-rss': runLearnRss,
  'self-reflect': runSelfReflect,
  'proactive-message': runProactiveMessage,
  'web-browse': runWebBrowse,
  'moltbook-social': runMoltbookSocial,
  'moltmatch': runMoltMatch,
  'ai-conversation': runAIConversation,
  'community-activity': runCommunityActivity,
};

const SKILL_ORDER: SkillId[] = [
  'learn-rss',
  'web-browse',
  'self-reflect',
  'moltmatch',
  'ai-conversation',
  'moltbook-social',
  'community-activity',
  'proactive-message',
];

const BYOK_PROVIDERS = ['groq', 'openai', 'deepseek', 'anthropic'] as const;

async function resolveProvider(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ provider: string; apiKey: string } | null> {
  for (const provider of BYOK_PROVIDERS) {
    const { data: row } = await supabase
      .from('gyeol_byok_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.encrypted_key) {
      try {
        const apiKey = await decryptKey(row.encrypted_key);
        return { provider, apiKey };
      } catch {
        continue;
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }

  return null;
}

export async function runHeartbeat(
  supabase: SupabaseClient,
  agentId: string,
): Promise<HeartbeatResult> {
  const start = Date.now();
  const skillsRun: SkillResult[] = [];
  const skipped: string[] = [];

  const killed = await checkKillSwitch(supabase);
  if (killed) {
    return { agentId, skillsRun: [], skipped: ['all (kill switch active)'], durationMs: Date.now() - start };
  }

  const anomaly = await detectAnomaly(supabase, agentId);
  if (anomaly.isAnomaly) {
    return { agentId, skillsRun: [], skipped: [`all (anomaly: ${anomaly.reason})`], durationMs: Date.now() - start };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('user_id, settings')
    .eq('id', agentId)
    .single();

  if (!agent) {
    return { agentId, skillsRun: [], skipped: ['all (agent not found)'], durationMs: Date.now() - start };
  }

  const resolved = await resolveProvider(supabase, agent.user_id);

  const settings = (agent.settings as Record<string, unknown>) ?? {};
  const autonomyLevel = (typeof settings.autonomyLevel === 'number' ? settings.autonomyLevel : 50);

  const ctx: SkillContext = {
    supabase,
    agentId,
    autonomyLevel,
    provider: resolved?.provider,
    apiKey: resolved?.apiKey,
  };

  for (const skillId of SKILL_ORDER) {
    try {
      const runner = SKILL_RUNNERS[skillId];
      const result = await Promise.race([
        runner(ctx),
        new Promise<SkillResult>((_, reject) =>
          setTimeout(() => reject(new Error('Skill timeout (6s)')), 6000)
        ),
      ]);
      skillsRun.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      skillsRun.push({ ok: false, skillId, summary: message });
    }
  }

  return { agentId, skillsRun, skipped, durationMs: Date.now() - start };
}

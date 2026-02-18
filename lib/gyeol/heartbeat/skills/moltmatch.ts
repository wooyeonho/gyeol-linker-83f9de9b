import type { SkillContext, SkillResult } from '../types';
import { findTopMatches } from '../../social/taste-vector';

export async function runMoltMatch(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, autonomyLevel } = ctx;
  if (autonomyLevel < 30) {
    return { ok: true, skillId: 'moltmatch', summary: 'Autonomy too low for matching' };
  }

  const { data: existingMatch } = await supabase
    .from('gyeol_matches')
    .select('id, status')
    .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
    .in('status', ['pending', 'matched', 'chatting'])
    .limit(1)
    .maybeSingle();
  if (existingMatch) {
    return { ok: true, skillId: 'moltmatch', summary: `이미 매칭 진행 중: ${existingMatch.status}` };
  }

  const matches = await findTopMatches(supabase, agentId, 5);
  if (matches.length === 0) {
    return { ok: true, skillId: 'moltmatch', summary: '매칭 가능한 AI 없음' };
  }

  const best = matches[0];

  const { data: reverseMatch } = await supabase
    .from('gyeol_matches')
    .select('id')
    .or(`agent_1_id.eq.${best.agentId},agent_2_id.eq.${best.agentId}`)
    .in('status', ['pending', 'matched', 'chatting'])
    .limit(1)
    .maybeSingle();

  if (reverseMatch) {
    const next = matches.find((m) => m.agentId !== best.agentId);
    if (!next) {
      return { ok: true, skillId: 'moltmatch', summary: '매칭 가능한 AI 모두 이미 매칭됨' };
    }
    await createMatch(supabase, agentId, next.agentId, next.compatibilityScore);
    return { ok: true, skillId: 'moltmatch', summary: `매칭 생성: 호환도 ${next.compatibilityScore}%` };
  }

  await createMatch(supabase, agentId, best.agentId, best.compatibilityScore);

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'social',
    summary: `[MoltMatch] 새 매칭! 호환도 ${best.compatibilityScore}%`,
    details: { matchedWith: best.agentId, score: best.compatibilityScore },
    was_sandboxed: true,
  });

  return {
    ok: true,
    skillId: 'moltmatch',
    summary: `매칭 성공: 호환도 ${best.compatibilityScore}%`,
    details: { matchedWith: best.agentId, score: best.compatibilityScore },
  };
}

async function createMatch(
  supabase: SkillContext['supabase'],
  agent1Id: string,
  agent2Id: string,
  score: number,
): Promise<void> {
  await supabase.from('gyeol_matches').insert({
    agent_1_id: agent1Id,
    agent_2_id: agent2Id,
    compatibility_score: score,
    status: 'matched',
  });
}

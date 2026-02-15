/**
 * GYEOL Kill Switch — 모든 API/자율 활동 전 체크
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const CACHE_MS = 30_000;
let cached: { active: boolean; at: number } = { active: false, at: 0 };

export async function checkKillSwitch(supabase: SupabaseClient): Promise<boolean> {
  if (Date.now() - cached.at < CACHE_MS) return cached.active;
  const { data } = await supabase.from('gyeol_system_state').select('kill_switch').eq('id', 'global').maybeSingle();
  cached = { active: data?.kill_switch === true, at: Date.now() };
  return cached.active;
}

export function invalidateKillSwitchCache(): void {
  cached = { active: false, at: 0 };
}

/**
 * Node.js heartbeat — DEPRECATED
 * 
 * All heartbeat logic now lives in the Edge Function:
 *   supabase/functions/heartbeat/index.ts
 * 
 * This file is kept only for type re-exports and backward compatibility.
 */
export type { SkillId, SkillContext, SkillResult, HeartbeatResult, HeartbeatJob } from './types';

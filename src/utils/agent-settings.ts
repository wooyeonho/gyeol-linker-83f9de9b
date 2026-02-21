import type { Json } from '@/integrations/supabase/types';

export type AgentSettings = {
  mode?: string;
  persona?: string;
  personaCustom?: string;
  customSystemPrompt?: string;
  customThemeColor?: string;
  profilePicture?: string;
  readSpeed?: number;
  referral_code?: string;
  evolution_threshold?: number;
  auto_tts?: boolean;
  autoTTS?: boolean;
  tts_speed?: number;
  ttsSpeed?: number;
  personalityLocked?: boolean;
  savedPresets?: unknown[];
  kidsSafe?: boolean;
  analysisDomains?: string[];
  customChar?: {
    color1?: string;
    color2?: string;
    glow?: number;
    emoji?: string;
  };
  [key: string]: unknown;
};

export function parseSettings(settings: Json | undefined | null): AgentSettings {
  if (typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    return settings as unknown as AgentSettings;
  }
  return {};
}

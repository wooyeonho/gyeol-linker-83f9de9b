/**
 * GYEOL BYOK 클라이언트 — localStorage 기반 API 키 관리
 * Supabase 없이도 동작
 */

const STORAGE_KEY = 'gyeol_byok_keys';

export type BYOKProvider = 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'gemini' | 'cloudflare' | 'ollama';

interface StoredKey {
  provider: BYOKProvider;
  apiKey: string;
  masked: string;
  savedAt: string;
}

function mask(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function loadAll(): StoredKey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(keys: StoredKey[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getStoredKeys(): { provider: BYOKProvider; masked: string }[] {
  return loadAll().map((k) => ({ provider: k.provider, masked: k.masked }));
}

export function getKeyForProvider(provider: BYOKProvider): string | null {
  const keys = loadAll();
  const found = keys.find((k) => k.provider === provider);
  return found?.apiKey ?? null;
}

export function getFirstAvailableKey(): { provider: BYOKProvider; apiKey: string } | null {
  const keys = loadAll();
  if (keys.length === 0) return null;
  return { provider: keys[0].provider, apiKey: keys[0].apiKey };
}

export function getAllKeys(): { provider: BYOKProvider; apiKey: string }[] {
  return loadAll().map((k) => ({ provider: k.provider, apiKey: k.apiKey }));
}

export function saveKey(provider: BYOKProvider, apiKey: string) {
  const keys = loadAll().filter((k) => k.provider !== provider);
  keys.push({ provider, apiKey, masked: mask(apiKey), savedAt: new Date().toISOString() });
  saveAll(keys);
}

export function removeKey(provider: BYOKProvider) {
  const keys = loadAll().filter((k) => k.provider !== provider);
  saveAll(keys);
}

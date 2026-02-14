/**
 * GYEOL BYOK — 사용자 API 키 암호화/복호화 (서버 전용)
 * 클라이언트에는 마스킹된 형태만 노출
 */

const ALGO = 'AES-GCM';
const KEY_LEN = 256;
const IV_LEN = 12;

function getKey(): CryptoKey | null {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) return null;
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.slice(0, 32)),
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptKey(apiKey: string): Promise<string> {
  const key = await getKey();
  if (!key) throw new Error('ENCRYPTION_SECRET not configured');
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = await crypto.subtle.encrypt(
    { name: ALGO, iv, tagLength: 128 },
    key,
    new TextEncoder().encode(apiKey)
  );
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptKey(encrypted: string): Promise<string> {
  const key = await getKey();
  if (!key) throw new Error('ENCRYPTION_SECRET not configured');
  const raw = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LEN);
  const data = raw.slice(IV_LEN);
  const dec = await crypto.subtle.decrypt(
    { name: ALGO, iv, tagLength: 128 },
    key,
    data
  );
  return new TextDecoder().decode(dec);
}

export function maskKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****';
  return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}

export const SUPPORTED_PROVIDERS = [
  'openai',
  'anthropic',
  'deepseek',
  'groq',
  'gemini',
  'cloudflare',
  'ollama',
] as const;

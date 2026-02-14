/**
 * GYEOL 콘텐츠 필터
 */
const KR_PROFANITY = [/시발|씨발|ㅅㅂ|ㅂㅅ|지랄|닥쳐|꺼져|병신|븅신|미친|미쳤|죽어|뒤져|한남|한녀|김치녀|한남충/i];
const DANGER_KEYWORDS = [
  /\b(만들어|구하는|구입|구매).*(폭탄|총기|무기|흉기)\b/i,
  /\b(자해|자살|목숨)\s*(방법|하는)\b/i,
  /\b(마약|필로폰|대마)\b/i,
];
const PII_PHONE = /01[0-9]-?[0-9]{3,4}-?[0-9]{4}/g;
const PII_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PII_RRN = /\d{6}-?[1-4]\d{6}/g;
function cloneGlobalRegex(r: RegExp): RegExp {
  return new RegExp(r.source, r.flags);
}

export interface FilterResult {
  safe: boolean;
  filtered: string;
  flags: string[];
}

export function filterInput(text: string): FilterResult {
  const flags: string[] = [];
  let filtered = text;
  for (const pattern of KR_PROFANITY) {
    if (pattern.test(text)) flags.push('profanity');
  }
  for (const pattern of DANGER_KEYWORDS) {
    if (pattern.test(text)) flags.push('danger');
  }
  if (cloneGlobalRegex(PII_PHONE).test(text)) {
    flags.push('pii_phone');
    filtered = filtered.replace(PII_PHONE, '[전화번호 삭제]');
  }
  if (cloneGlobalRegex(PII_EMAIL).test(text)) {
    flags.push('pii_email');
    filtered = filtered.replace(PII_EMAIL, '[이메일 삭제]');
  }
  if (cloneGlobalRegex(PII_RRN).test(text)) {
    flags.push('pii_rrn');
    filtered = filtered.replace(PII_RRN, '[주민번호 삭제]');
  }
  const safe = !flags.some((f) => f === 'profanity' || f === 'danger');
  return { safe, filtered, flags };
}

export function filterOutput(text: string): FilterResult {
  const flags: string[] = [];
  let filtered = text;
  if (cloneGlobalRegex(PII_PHONE).test(text)) {
    flags.push('pii_phone');
    filtered = filtered.replace(PII_PHONE, '[전화번호 삭제]');
  }
  if (cloneGlobalRegex(PII_EMAIL).test(text)) {
    flags.push('pii_email');
    filtered = filtered.replace(PII_EMAIL, '[이메일 삭제]');
  }
  if (cloneGlobalRegex(PII_RRN).test(text)) {
    flags.push('pii_rrn');
    filtered = filtered.replace(PII_RRN, '[주민번호 삭제]');
  }
  for (const pattern of KR_PROFANITY) {
    if (pattern.test(text)) flags.push('profanity');
  }
  return { safe: flags.length === 0, filtered, flags };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  rate: number = 1.0,
  onEnd?: () => void,
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeaking(): boolean {
  return typeof window !== 'undefined' && window.speechSynthesis.speaking;
}

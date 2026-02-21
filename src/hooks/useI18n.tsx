import { useState, useCallback, createContext, useContext } from 'react';

type Locale = 'ko' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    'nav.chat': '채팅', 'nav.social': '소셜', 'nav.activity': '활동',
    'nav.market': '마켓', 'nav.settings': '설정',
    'chat.placeholder': '메시지를 입력하세요...', 'chat.send': '전송',
    'chat.thinking': '생각 중...', 'settings.title': '설정',
    'settings.language': '언어', 'settings.theme': '테마',
    'settings.notifications': '알림',
    'settings.delete_account': '계정 삭제',
    'settings.delete_confirm': '정말 삭제하시겠습니까? 모든 데이터가 영구 삭제됩니다.',
    'settings.feedback': '피드백 보내기',
    'settings.referral': '친구 초대',
    'settings.export_data': '데이터 내보내기',
    'settings.terms': '이용약관',
    'settings.privacy': '개인정보처리방침',
    'auth.login': '로그인', 'auth.signup': '회원가입',
    'auth.email': '이메일', 'auth.password': '비밀번호',
    'auth.agree_terms': '이용약관에 동의합니다',
    'error.network': '인터넷 연결을 확인해주세요',
    'error.server': '서버가 잠시 바쁩니다',
    'error.rate_limit': '잠시 후 다시 시도해주세요',
    'error.auth': '세션이 만료되었습니다',
    'error.generic': '오류가 발생했습니다',
    'onboarding.step1.title': 'GYEOL에 오신 걸 환영해요',
    'onboarding.step1.desc': 'AI 동반자와 대화하고, 성격을 형성하고, 함께 성장하세요',
    'onboarding.step2.title': 'AI가 진화해요',
    'onboarding.step2.desc': '대화할수록 AI의 성격이 발전하고, 새로운 능력을 얻어요',
    'onboarding.step3.title': '소셜 세계에 참여하세요',
    'onboarding.step3.desc': '다른 AI들과 교류하고, MoltBook에 이야기를 공유하세요',
    'onboarding.skip': '건너뛰기', 'onboarding.next': '다음',
    'onboarding.start': '시작하기',
    'referral.title': '친구 초대',
    'referral.code': '초대 코드',
    'referral.copy': '복사',
    'referral.enter_code': '초대 코드 입력',
    'referral.apply': '적용',
    'export.title': '데이터 내보내기',
    'export.button': '다운로드',
    'export.preparing': '준비 중...',
  },
  en: {
    'nav.chat': 'Chat', 'nav.social': 'Social', 'nav.activity': 'Activity',
    'nav.market': 'Market', 'nav.settings': 'Settings',
    'chat.placeholder': 'Type a message...', 'chat.send': 'Send',
    'chat.thinking': 'Thinking...', 'settings.title': 'Settings',
    'settings.language': 'Language', 'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.delete_account': 'Delete Account',
    'settings.delete_confirm': 'Are you sure? All data will be permanently deleted.',
    'settings.feedback': 'Send Feedback',
    'settings.referral': 'Invite Friends',
    'settings.export_data': 'Export My Data',
    'settings.terms': 'Terms of Service',
    'settings.privacy': 'Privacy Policy',
    'auth.login': 'Login', 'auth.signup': 'Sign Up',
    'auth.email': 'Email', 'auth.password': 'Password',
    'auth.agree_terms': 'I agree to the Terms of Service',
    'error.network': 'Please check your internet connection',
    'error.server': 'Server is temporarily busy',
    'error.rate_limit': 'Please try again later',
    'error.auth': 'Session expired',
    'error.generic': 'An error occurred',
    'onboarding.step1.title': 'Welcome to GYEOL',
    'onboarding.step1.desc': 'Chat with your AI companion, shape their personality, and grow together',
    'onboarding.step2.title': 'Your AI Evolves',
    'onboarding.step2.desc': 'The more you chat, the more your AI develops unique traits and abilities',
    'onboarding.step3.title': 'Join the Social World',
    'onboarding.step3.desc': 'Connect with other AIs, share stories on MoltBook',
    'onboarding.skip': 'Skip', 'onboarding.next': 'Next',
    'onboarding.start': 'Get Started',
    'referral.title': 'Invite Friends',
    'referral.code': 'Invite Code',
    'referral.copy': 'Copy',
    'referral.enter_code': 'Enter invite code',
    'referral.apply': 'Apply',
    'export.title': 'Export My Data',
    'export.button': 'Download',
    'export.preparing': 'Preparing...',
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'ko',
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('gyeol_locale') as Locale;
    if (stored && (stored === 'ko' || stored === 'en')) return stored;
    const browser = navigator.language.slice(0, 2);
    return browser === 'ko' ? 'ko' : 'en';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('gyeol_locale', l);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[locale][key] ?? translations['en'][key] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

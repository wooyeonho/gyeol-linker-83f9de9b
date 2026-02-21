/**
 * GYEOL i18n — Lightweight multilingual support
 * Supports EN, KO, JA with localStorage persistence
 */

export type Locale = 'en' | 'ko' | 'ja';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.social': 'Social',
    'nav.market': 'Market',
    'nav.activity': 'Activity',
    'nav.settings': 'Settings',
    // Chat
    'chat.placeholder': 'Message GYEOL...',
    'chat.send': 'Send',
    'chat.typing': 'Typing...',
    'chat.today': 'Today',
    'chat.yesterday': 'Yesterday',
    'chat.summary': 'Summarize',
    'chat.summarizing': 'Summarizing...',
    'chat.bookmark': 'Bookmark',
    'chat.pin': 'Pin',
    'chat.edit': 'Edit',
    'chat.delete': 'Delete',
    'chat.copy': 'Copy',
    'chat.translate': 'Translate',
    // Social
    'social.foryou': 'For You',
    'social.following': 'Following',
    'social.moltbook': 'Moltbook',
    'social.timeline': 'Timeline',
    'social.compare': 'Compare',
    'social.match': 'Match',
    'social.follow': 'Follow',
    'social.unfollow': 'Unfollow',
    // Settings
    'settings.title': 'Settings',
    'settings.personality': 'Personality',
    'settings.character': 'Character',
    'settings.language': 'Language',
    'settings.signout': 'Sign out',
    'settings.save': 'Save',
    'settings.saved': 'Saved!',
    // Gamification
    'game.quests': 'Quests',
    'game.achievements': 'Achievements',
    'game.leaderboard': 'Leaderboard',
    'game.shop': 'Shop',
    'game.coins': 'Coins',
    'game.level': 'Level',
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.disclaimer': 'GYEOL can make mistakes. Verify important information.',
  },
  ko: {
    'nav.chat': '채팅',
    'nav.social': '소셜',
    'nav.market': '마켓',
    'nav.activity': '활동',
    'nav.settings': '설정',
    'chat.placeholder': 'GYEOL에게 메시지...',
    'chat.send': '전송',
    'chat.typing': '입력 중...',
    'chat.today': '오늘',
    'chat.yesterday': '어제',
    'chat.summary': '요약',
    'chat.summarizing': '요약 중...',
    'chat.bookmark': '북마크',
    'chat.pin': '고정',
    'chat.edit': '수정',
    'chat.delete': '삭제',
    'chat.copy': '복사',
    'chat.translate': '번역',
    'social.foryou': '추천',
    'social.following': '팔로잉',
    'social.moltbook': '몰트북',
    'social.timeline': '타임라인',
    'social.compare': '비교',
    'social.match': '매칭',
    'social.follow': '팔로우',
    'social.unfollow': '언팔로우',
    'settings.title': '설정',
    'settings.personality': '성격',
    'settings.character': '캐릭터',
    'settings.language': '언어',
    'settings.signout': '로그아웃',
    'settings.save': '저장',
    'settings.saved': '저장됨!',
    'game.quests': '퀘스트',
    'game.achievements': '업적',
    'game.leaderboard': '리더보드',
    'game.shop': '상점',
    'game.coins': '코인',
    'game.level': '레벨',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.confirm': '확인',
    'common.cancel': '취소',
    'common.close': '닫기',
    'common.disclaimer': 'GYEOL은 실수할 수 있습니다. 중요한 정보는 확인하세요.',
  },
  ja: {
    'nav.chat': 'チャット',
    'nav.social': 'ソーシャル',
    'nav.market': 'マーケット',
    'nav.activity': 'アクティビティ',
    'nav.settings': '設定',
    'chat.placeholder': 'GYEOLにメッセージ...',
    'chat.send': '送信',
    'chat.typing': '入力中...',
    'chat.today': '今日',
    'chat.yesterday': '昨日',
    'chat.summary': '要約',
    'chat.summarizing': '要約中...',
    'chat.bookmark': 'ブックマーク',
    'chat.pin': 'ピン留め',
    'chat.edit': '編集',
    'chat.delete': '削除',
    'chat.copy': 'コピー',
    'chat.translate': '翻訳',
    'social.foryou': 'おすすめ',
    'social.following': 'フォロー中',
    'social.moltbook': 'モルトブック',
    'social.timeline': 'タイムライン',
    'social.compare': '比較',
    'social.match': 'マッチング',
    'social.follow': 'フォロー',
    'social.unfollow': 'フォロー解除',
    'settings.title': '設定',
    'settings.personality': '性格',
    'settings.character': 'キャラクター',
    'settings.language': '言語',
    'settings.signout': 'ログアウト',
    'settings.save': '保存',
    'settings.saved': '保存完了！',
    'game.quests': 'クエスト',
    'game.achievements': '実績',
    'game.leaderboard': 'ランキング',
    'game.shop': 'ショップ',
    'game.coins': 'コイン',
    'game.level': 'レベル',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.confirm': '確認',
    'common.cancel': 'キャンセル',
    'common.close': '閉じる',
    'common.disclaimer': 'GYEOLは間違えることがあります。重要な情報は確認してください。',
  },
};

let currentLocale: Locale = (typeof window !== 'undefined' ? localStorage.getItem('gyeol_locale') as Locale : null) ?? 'en';

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('gyeol_locale', locale);
  }
}

export function t(key: string): string {
  return translations[currentLocale]?.[key] ?? translations.en[key] ?? key;
}

export function getAvailableLocales(): { code: Locale; label: string }[] {
  return [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
  ];
}

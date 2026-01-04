'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useToast } from './Toast';

/**
 * 키보드 단축키 지원
 * 접근성 및 사용자 경험 향상
 */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: 검색 (향후 구현)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // 검색 기능 구현 시 활성화
        // addToast({ type: 'info', message: '검색 기능은 곧 출시됩니다.' });
      }

      // Ctrl/Cmd + /: 도움말
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        addToast({
          type: 'info',
          message: '키보드 단축키: Ctrl+K (검색), Ctrl+/ (도움말), Esc (닫기)',
          duration: 5000,
        });
      }

      // Esc: 모달/드롭다운 닫기 (전역 처리)
      if (e.key === 'Escape') {
        // 모달이나 드롭다운이 열려있으면 닫기
        // 이는 각 컴포넌트에서 개별적으로 처리
      }

      // Alt + H: 홈으로 이동
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        router.push(`/${locale}`);
      }

      // Alt + P: 프롬프트 페이지로 이동
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        router.push(`/${locale}/prompts`);
      }

      // Alt + C: 커뮤니티로 이동
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        router.push(`/${locale}/community`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, locale, addToast]);

  return null;
}


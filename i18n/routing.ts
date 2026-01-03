import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

/**
 * next-intl 라우팅 설정
 * 지원 언어와 기본 언어 정의
 */
export const routing = defineRouting({
  // 지원하는 언어 목록
  locales: ['ko', 'en'],
  
  // 기본 언어
  defaultLocale: 'ko',
  
  // URL에 항상 locale 포함
  localePrefix: 'always',
});

/**
 * 타입 안전한 네비게이션 헬퍼
 * useRouter, Link 등에서 사용
 */
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);



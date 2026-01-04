import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * next-intl 요청 설정
 * 서버 컴포넌트에서 사용할 메시지 로드
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // 미들웨어에서 감지한 locale 사용
  let locale = await requestLocale;

  // locale이 없거나 지원하지 않는 언어면 기본값 사용
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../dictionaries/${locale}.json`)).default,
  };
});



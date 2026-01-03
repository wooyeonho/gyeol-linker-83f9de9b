import createNextIntlPlugin from 'next-intl/plugin';

/**
 * next-intl 플러그인
 * i18n/request.ts를 자동으로 인식
 */
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 추가 설정이 필요한 경우 여기에 작성
};

export default withNextIntl(nextConfig);



import { MetadataRoute } from 'next';

/**
 * Robots.txt 생성
 * 검색 엔진 크롤링 규칙 설정
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/seller/',
          '/checkout/',
          '/orders/',
          '/library/',
          '/my-prompts/',
          '/_next/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}





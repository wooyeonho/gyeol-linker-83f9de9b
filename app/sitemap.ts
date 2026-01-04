import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

/**
 * Sitemap 생성
 * 모든 프롬프트와 주요 페이지를 포함
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com';
  const supabase = await createClient();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = routing.locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/${locale}/prompts`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${locale}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ]);

  // 승인된 프롬프트 조회
  const { data: prompts } = await supabase
    .from('prompts')
    .select('slug, updated_at')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(10000); // 최대 10,000개

  // 프롬프트 페이지
  const promptPages: MetadataRoute.Sitemap =
    prompts?.flatMap((prompt) =>
      routing.locales.map((locale) => ({
        url: `${baseUrl}/${locale}/prompts/${prompt.slug}`,
        lastModified: new Date(prompt.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    ) || [];

  return [...staticPages, ...promptPages];
}




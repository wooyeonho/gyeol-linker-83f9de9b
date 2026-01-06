import { createClient } from '@/lib/supabase/server';
import { MetadataRoute } from 'next';

/**
 * Dynamic Sitemap Generation
 * Generates sitemap for all approved prompts in both EN and KO
 * World-Class SEO implementation
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com';
  
  // Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ko`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/en/prompts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ko/prompts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/community`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ko/community`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  try {
    // Get all approved prompts
    const supabase = await createClient();
    const { data: prompts } = await supabase
      .from('prompts')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (!prompts || prompts.length === 0) {
      return staticPages;
    }

    // Generate prompt pages for both EN and KO
    const promptPages: MetadataRoute.Sitemap = prompts.flatMap((prompt) => [
      {
        url: `${baseUrl}/en/prompts/${prompt.slug}`,
        lastModified: new Date(prompt.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/ko/prompts/${prompt.slug}`,
        lastModified: new Date(prompt.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
    ]);

    return [...staticPages, ...promptPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}

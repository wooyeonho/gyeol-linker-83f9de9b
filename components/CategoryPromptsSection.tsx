import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PromptCard, { PromptCardData } from '@/components/PromptCard';
import PromptCardSkeleton from '@/components/PromptCardSkeleton';
import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import StaggerGrid from '@/components/StaggerGrid';

/**
 * 카테고리별 프롬프트 섹션
 */
async function CategorySection({
  locale,
  category,
  categoryLabel,
}: {
  locale: string;
  category: string;
  categoryLabel: string;
}) {
  const t = await getTranslations('home');
  const prompts = await fetchCategoryPrompts(locale, category, 4);

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 카테고리 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">{categoryLabel}</h3>
        <Link
          href={`/prompts?category=${encodeURIComponent(category)}`}
          className="text-primary hover:text-primary-600 transition-colors font-medium"
        >
          {t('viewMore')} →
        </Link>
      </div>

      {/* 프롬프트 그리드 */}
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {prompts.map((prompt, index) => (
          <PromptCard key={prompt.id} prompt={prompt} priority={index < 4} />
        ))}
      </StaggerGrid>
    </div>
  );
}

/**
 * 카테고리별 프롬프트 조회
 */
async function fetchCategoryPrompts(
  locale: string,
  category: string,
  limit: number = 4
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .eq(locale === 'ko' ? 'category_ko' : 'category_en', category)
    .order('purchase_count', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((prompt: any) => {
    const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
    const description =
      locale === 'ko' ? prompt.description_ko : prompt.description_en;

    return {
      id: prompt.id,
      slug: prompt.slug,
      title,
      description,
      thumbnail: prompt.thumbnail_url || '',
      tags: prompt.tags || [],
      aiModel: prompt.ai_model,
      rating: prompt.average_rating || 0,
      price: parseFloat(prompt.price),
      viewCount: prompt.view_count,
      purchaseCount: prompt.purchase_count,
      createdAt: prompt.created_at,
    };
  });
}

/**
 * 카테고리별 프롬프트 섹션 컨테이너
 */
export default async function CategoryPromptsSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations('home');

  // 주요 카테고리 (예시 - 실제 카테고리는 DB에서 가져와야 함)
  const categories = [
    { key: 'Writing', label: '작성' },
    { key: 'Marketing', label: '마케팅' },
    { key: 'Design', label: '디자인' },
  ];

  return (
    <section className="py-24 md:py-32 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-3 mb-12">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t('categoryRecommendations')}
          </h2>
        </div>

        {/* 카테고리별 섹션 */}
        <div className="space-y-16">
          {categories.map((cat) => (
            <Suspense
              key={cat.key}
              fallback={
                <div className="space-y-6">
                  <div className="h-8 bg-gray-800 rounded w-32 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <PromptCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              }
            >
              <CategorySection
                locale={locale}
                category={cat.key}
                categoryLabel={cat.label}
              />
            </Suspense>
          ))}
        </div>
      </div>
    </section>
  );
}


import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import HeroSection from '@/components/HeroSection';
import RecommendedPrompts from '@/components/RecommendedPrompts';
import CommunityPopularSection from '@/components/CommunityPopularSection';
import CategoryPromptsSection from '@/components/CategoryPromptsSection';
import PromptCardSkeleton from '@/components/PromptCardSkeleton';
import MotionViewport from '@/components/MotionViewport';
import { createClient } from '@/lib/supabase/server';
import { getRecommendedPrompts } from '@/app/actions/recommendations';

/**
 * 추천 프롬프트 섹션 컴포넌트
 */
async function RecommendedSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations('recommendations');
  const supabase = await createClient();

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 추천 프롬프트 조회
  const recommendedPrompts = await getRecommendedPrompts(
    user?.id || null,
    locale,
    8
  );

  if (recommendedPrompts.length === 0) {
    return null;
  }

  const title = user
    ? t('title')
    : t('popularPrompts');

  return (
    <RecommendedPrompts
      prompts={recommendedPrompts}
      title={title}
      columns={4}
    />
  );
}

/**
 * 홈 페이지
 * Server Component로 구현
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main>
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. AI 추천 프롬프트 섹션 */}
        <MotionViewport>
          <section className="py-24 md:py-32 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <Suspense
              fallback={
                <>
                  <div className="h-8 bg-gray-800 rounded w-64 mb-8 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <PromptCardSkeleton key={i} />
                    ))}
                  </div>
                </>
              }
            >
                <RecommendedSection locale={locale} />
              </Suspense>
            </div>
          </section>
        </MotionViewport>

        {/* 3. 커뮤니티 실시간 인기글 섹션 */}
        <MotionViewport>
          <Suspense
            fallback={
              <section className="py-24 md:py-32 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                  <div className="h-8 bg-gray-800 rounded w-64 mb-8 animate-pulse" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                      >
                        <div className="h-6 bg-gray-800 rounded w-3/4 mb-4" />
                        <div className="h-4 bg-gray-800 rounded w-full mb-2" />
                        <div className="h-4 bg-gray-800 rounded w-5/6" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <CommunityPopularSection />
          </Suspense>
        </MotionViewport>

        {/* 4. 카테고리별 신규 프롬프트 및 베스트셀러 */}
        <MotionViewport>
          <Suspense
            fallback={
              <section className="py-24 md:py-32 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                  <div className="h-8 bg-gray-800 rounded w-64 mb-12 animate-pulse" />
                  <div className="space-y-16">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-6">
                        <div className="h-6 bg-gray-800 rounded w-32 animate-pulse" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                          {Array.from({ length: 4 }).map((_, j) => (
                            <PromptCardSkeleton key={j} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <CategoryPromptsSection locale={locale} />
          </Suspense>
        </MotionViewport>
      </main>
  );
}

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import PromptCard, { PromptCardData } from '@/components/PromptCard';
import PromptCardSkeleton from '@/components/PromptCardSkeleton';
import StaggerGrid from '@/components/StaggerGrid';

/**
 * 추천 프롬프트 목록 컴포넌트 (Suspense 래퍼)
 */
async function RecommendedPromptsList({
  prompts,
  columns = 4,
}: {
  prompts: PromptCardData[];
  columns?: number;
}) {
  if (prompts.length === 0) {
    return null;
  }

  const gridColsClass =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <StaggerGrid className={`grid ${gridColsClass} gap-8`}>
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </StaggerGrid>
  );
}

/**
 * 추천 프롬프트 섹션 컴포넌트
 */
export default async function RecommendedPrompts({
  prompts,
  title,
  columns = 4,
}: {
  prompts: PromptCardData[];
  title: string;
  columns?: number;
}) {
  if (prompts.length === 0) {
    return null;
  }

  const gridColsClass =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
          {title}
        </h2>
        <Suspense
          fallback={
            <div className={`grid ${gridColsClass} gap-8`}>
            {Array.from({ length: prompts.length }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        }
      >
            <RecommendedPromptsList prompts={prompts} columns={columns} />
          </Suspense>
      </div>
    </section>
  );
}


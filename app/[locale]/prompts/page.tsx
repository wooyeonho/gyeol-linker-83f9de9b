import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Metadata } from 'next';
import { getPromptsList, SortType } from '@/app/actions/prompts';
import PromptCard from '@/components/PromptCard';
import PromptCardSkeleton from '@/components/PromptCardSkeleton';
import SortTabs from '@/components/SortTabs';
import StaggerGrid from '@/components/StaggerGrid';
import { PromptCardData } from '@/components/PromptCard';

/**
 * 동적 SEO 메타데이터 생성
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { sort } = await searchParams;
  const t = await getTranslations('prompts');

  const sortLabel = sort
    ? t(`sort${sort.charAt(0).toUpperCase() + sort.slice(1)}`)
    : t('sortPopular');

  const title =
    locale === 'ko'
      ? `프롬프트 마켓플레이스 - ${sortLabel}`
      : `Prompt Marketplace - ${sortLabel}`;
  const description =
    locale === 'ko'
      ? 'AI 프롬프트 전문가들의 마켓플레이스. 고품질 프롬프트를 발견하고 구매하세요.'
      : 'Marketplace for AI Prompt Experts. Discover and purchase high-quality prompts.';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeom.com';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/prompts${sort ? `?sort=${sort}` : ''}`,
      siteName: '프롬프트 정음',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/prompts${sort ? `?sort=${sort}` : ''}`,
      languages: {
        ko: `${baseUrl}/ko/prompts${sort ? `?sort=${sort}` : ''}`,
        en: `${baseUrl}/en/prompts${sort ? `?sort=${sort}` : ''}`,
      },
    },
  };
}

/**
 * 샘플 프롬프트 데이터 (DB가 비어있을 때 표시)
 */
const SAMPLE_PROMPTS: PromptCardData[] = [
  {
    id: 'sample-1',
    slug: 'sample-gpt-4o-prompt',
    title: 'GPT-4o 고급 프롬프트 엔지니어링',
    description: '복잡한 작업을 단계별로 분해하여 처리하는 고급 프롬프트 템플릿',
    thumbnail: '',
    tags: ['GPT-4o', '프롬프트 엔지니어링', '고급'],
    aiModel: 'GPT-4o',
    rating: 4.8,
    price: 9.99,
    viewCount: 1234,
    purchaseCount: 89,
  },
  {
    id: 'sample-2',
    slug: 'sample-claude-creative',
    title: 'Claude 3.5 창의적 글쓰기 프롬프트',
    description: '소설, 시, 마케팅 카피 등 창의적 콘텐츠 제작을 위한 프롬프트',
    thumbnail: '',
    tags: ['Claude 3.5', '글쓰기', '창의성'],
    aiModel: 'Claude 3.5',
    rating: 4.7,
    price: 7.99,
    viewCount: 987,
    purchaseCount: 67,
  },
  {
    id: 'sample-3',
    slug: 'sample-midjourney-art',
    title: 'Midjourney 아트 스타일 가이드',
    description: '다양한 아트 스타일과 시각적 효과를 만드는 프롬프트 모음',
    thumbnail: '',
    tags: ['Midjourney', '아트', '디자인'],
    aiModel: 'Midjourney',
    rating: 4.9,
    price: 12.99,
    viewCount: 2156,
    purchaseCount: 145,
  },
  {
    id: 'sample-4',
    slug: 'sample-automation-n8n',
    title: 'n8n 워크플로우 자동화 프롬프트',
    description: '비즈니스 프로세스를 자동화하는 워크플로우 설계 프롬프트',
    thumbnail: '',
    tags: ['n8n', '자동화', '워크플로우'],
    aiModel: 'GPT-4o',
    rating: 4.6,
    price: 14.99,
    viewCount: 756,
    purchaseCount: 52,
  },
];

/**
 * 프롬프트 목록 컴포넌트
 */
async function PromptsList({
  locale,
  sort,
}: {
  locale: string;
  sort: SortType;
}) {
  const prompts = await getPromptsList(locale, sort);

  // DB가 비어있으면 샘플 데이터 표시
  const displayPrompts = prompts.length > 0 ? prompts : SAMPLE_PROMPTS;

  if (displayPrompts.length === 0) {
    const t = await getTranslations('prompts');
    return (
      <div className="text-center py-24">
        <p className="text-gray-400 text-lg">{t('emptyMessage')}</p>
      </div>
    );
  }

  return (
    <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {displayPrompts.map((prompt, index) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          priority={index < 4} // 첫 4개만 priority
        />
      ))}
    </StaggerGrid>
  );
}

/**
 * 프롬프트 목록 페이지
 */
export default async function PromptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale } = await params;
  const { sort } = await searchParams;
  const t = await getTranslations('prompts');

  // 정렬 옵션 파싱 (기본값: popular)
  const sortOption: SortType =
    (sort as SortType) || 'popular';

  return (
    <main className="min-h-screen">
      <section className="py-24 md:py-32 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* 헤더 */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>

          {/* 정렬 탭 */}
          <div className="mb-12">
            <SortTabs />
          </div>

          {/* 프롬프트 목록 */}
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <PromptCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <PromptsList locale={locale} sort={sortOption} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}


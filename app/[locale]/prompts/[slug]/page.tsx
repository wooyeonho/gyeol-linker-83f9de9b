import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ImageGallery from '@/components/ImageGallery';
import PromptContent from '@/components/PromptContent';
import PurchaseSidebar from '@/components/PurchaseSidebar';
import ShareButtons from '@/components/ShareButtons';
import RecommendedPrompts from '@/components/RecommendedPrompts';
import PromptCardSkeleton from '@/components/PromptCardSkeleton';
import { createClient } from '@/lib/supabase/server';
import { getRelatedPrompts } from '@/app/actions/recommendations';
import { Star, Eye, ShoppingBag, User } from 'lucide-react';

/**
 * 프롬프트 상세 정보 타입
 */
interface PromptDetail {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  content: string | null; // RLS 정책에 의해 구매자만 접근 가능
  ai_model: string;
  price: number;
  category_ko: string;
  category_en: string;
  tags: string[];
  thumbnail_url: string;
  result_images: string[];
  result_video_url: string | null;
  average_rating: number;
  view_count: number;
  purchase_count: number;
  seller_id: string;
  seller_name: string | null;
}

/**
 * 프롬프트 조회 및 조회수 증가
 */
async function fetchPrompt(
  slug: string,
  locale: string
): Promise<PromptDetail | null> {
  const supabase = await createClient();

  // 프롬프트 조회 (판매자 정보 포함)
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select(
      `
      *,
      seller:profiles!prompts_seller_id_fkey(name)
    `
    )
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .single();

  if (error || !prompt) {
    return null;
  }

  // 조회수 증가 (RPC 함수 호출)
  await supabase.rpc('increment_prompt_view_count', {
    prompt_uuid: prompt.id,
  });

  return {
    id: prompt.id,
    slug: prompt.slug,
    title_ko: prompt.title_ko,
    title_en: prompt.title_en,
    description_ko: prompt.description_ko,
    description_en: prompt.description_en,
    content: prompt.content, // RLS 정책에 의해 구매자만 접근 가능
    ai_model: prompt.ai_model,
    price: parseFloat(prompt.price),
    category_ko: prompt.category_ko,
    category_en: prompt.category_en,
    tags: prompt.tags || [],
    thumbnail_url: prompt.thumbnail_url,
    result_images: prompt.result_images || [],
    result_video_url: prompt.result_video_url,
    average_rating: prompt.average_rating || 0,
    view_count: prompt.view_count,
    purchase_count: prompt.purchase_count,
    seller_id: prompt.seller_id,
    seller_name: (prompt.seller as any)?.name || null,
  };
}

/**
 * 구매 여부 확인
 */
async function checkPurchaseStatus(
  userId: string | null,
  promptId: string
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();

  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_id', userId)
    .eq('prompt_id', promptId)
    .eq('status', 'completed')
    .single();

  return !!data;
}

/**
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const prompt = await fetchPrompt(slug, locale);

  if (!prompt) {
    return {
      title: '프롬프트를 찾을 수 없습니다',
    };
  }

  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description =
    locale === 'ko' ? prompt.description_ko : prompt.description_en;
  
  // 전체 URL 생성 (환경 변수 또는 기본값 사용)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com';
  const url = `${baseUrl}/${locale}/prompts/${slug}`;

  return {
    title: `${title} | 프롬프트 정음`,
    description: description,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: '프롬프트 정음',
      images: [
        {
          url: prompt.thumbnail_url,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [prompt.thumbnail_url],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * 프롬프트 상세 페이지
 */
export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('prompts');
  const tCommon = await getTranslations('common');

  // 프롬프트 조회
  const prompt = await fetchPrompt(slug, locale);

  if (!prompt) {
    notFound();
  }

  // 현재 사용자 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 구매 여부 확인
  const hasPurchased = await checkPurchaseStatus(user?.id || null, prompt.id);

  // 다국어 필드 선택
  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description =
    locale === 'ko' ? prompt.description_ko : prompt.description_en;
  const category = locale === 'ko' ? prompt.category_ko : prompt.category_en;

  // 리뷰 수 조회
  const { count: reviewCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('prompt_id', prompt.id);

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero 섹션 */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                {title}
              </h1>

              {/* 메타 정보 */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                {/* 판매자 */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{prompt.seller_name || '판매자'}</span>
                </div>

                {/* 카테고리 */}
                <div className="flex items-center gap-2">
                  <span>{t('category')}:</span>
                  <span className="text-primary">{category}</span>
                </div>

                {/* 평점 */}
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{prompt.average_rating.toFixed(1)}</span>
                  <span>({reviewCount || 0} {t('reviews')})</span>
                </div>

                {/* 조회수 */}
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{prompt.view_count.toLocaleString()}</span>
                </div>

                {/* 구매수 */}
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{prompt.purchase_count.toLocaleString()}</span>
                </div>
              </div>

              {/* 태그 */}
              {prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 공유 버튼 */}
              <div className="mt-4">
                <ShareButtons
                  url={`/${locale}/prompts/${prompt.slug}`}
                  title={title}
                  description={description}
                />
              </div>
            </div>

            {/* 갤러리 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('gallery')}</h2>
              <ImageGallery
                thumbnail={prompt.thumbnail_url}
                images={prompt.result_images}
                videoUrl={prompt.result_video_url}
              />
            </div>

            {/* 상세 설명 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('detailDescription')}</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            </div>

            {/* 프롬프트 원문 */}
            <div>
              <PromptContent
                content={prompt.content}
                hasPurchased={hasPurchased}
              />
            </div>
          </div>

          {/* Sticky 사이드바 */}
          <div className="lg:col-span-1">
            <PurchaseSidebar
              promptId={prompt.id}
              price={prompt.price}
              hasPurchased={hasPurchased}
            />
          </div>
        </div>

        {/* 연관 프롬프트 섹션 */}
        <Suspense
          fallback={
            <section className="mt-16">
              <div className="h-8 bg-gray-800 rounded w-64 mb-8 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PromptCardSkeleton key={i} />
                ))}
              </div>
            </section>
          }
        >
          <RelatedPromptsSection promptId={prompt.id} locale={locale} />
        </Suspense>
      </main>
  );
}

/**
 * 연관 프롬프트 섹션 컴포넌트
 */
async function RelatedPromptsSection({
  promptId,
  locale,
}: {
  promptId: string;
  locale: string;
}) {
  const t = await getTranslations('recommendations');

  // 연관 프롬프트 조회
  const relatedPrompts = await getRelatedPrompts(promptId, locale, 4);

  if (relatedPrompts.length === 0) {
    return null;
  }

  return (
    <RecommendedPrompts
      prompts={relatedPrompts}
      title={t('relatedPrompts')}
      columns={4}
    />
  );
}


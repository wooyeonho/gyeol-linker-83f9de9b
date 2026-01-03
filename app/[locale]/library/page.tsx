import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LibraryCard from './LibraryCard';

/**
 * 구매한 프롬프트 정보 타입
 */
interface PurchasedPrompt {
  orderId: string;
  promptId: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  tags: string[];
  price: number;
  purchasedAt: string;
  existingReview: {
    id: string;
    rating: number;
    comment?: string;
  } | null;
}

/**
 * 구매한 프롬프트 목록 조회
 */
async function fetchPurchasedPrompts(
  userId: string,
  locale: string
): Promise<PurchasedPrompt[]> {
  const supabase = await createClient();

  // 1. 완료된 주문 조회
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, prompt_id, created_at')
    .eq('buyer_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (ordersError || !orders || orders.length === 0) {
    return [];
  }

  // 2. 각 주문의 프롬프트 정보 조회
  const promptIds = orders.map((order) => order.prompt_id);
  const { data: prompts, error: promptsError } = await supabase
    .from('prompts')
    .select('id, slug, title_ko, title_en, description_ko, description_en, thumbnail_url, tags, price')
    .in('id', promptIds)
    .is('deleted_at', null);

  if (promptsError || !prompts) {
    return [];
  }

  // 3. 각 주문의 리뷰 조회
  const orderIds = orders.map((order) => order.id);
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('id, order_id, rating, comment')
    .in('order_id', orderIds);

  if (reviewsError) {
    console.error('리뷰 조회 오류:', reviewsError);
  }

  // 4. 데이터 조합
  const purchasedPrompts: PurchasedPrompt[] = orders
    .flatMap((order) => {
      const prompt = prompts.find((p) => p.id === order.prompt_id);
      if (!prompt) return [];

      const review = reviews?.find((r) => r.order_id === order.id) || null;

      return [{
        orderId: order.id,
        promptId: prompt.id,
        slug: prompt.slug,
        title: locale === 'ko' ? prompt.title_ko : prompt.title_en,
        description:
          locale === 'ko' ? prompt.description_ko : prompt.description_en,
        thumbnail: prompt.thumbnail_url || '',
        tags: prompt.tags || [],
        price: parseFloat(prompt.price.toString()),
        purchasedAt: order.created_at,
        existingReview: review
          ? {
              id: review.id,
              rating: review.rating,
              comment: review.comment || undefined,
            }
          : null,
      }];
    });

  return purchasedPrompts;
}

/**
 * 라이브러리 페이지
 */
export default async function LibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('library');
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 2. 구매한 프롬프트 목록 조회
  const purchasedPrompts = await fetchPurchasedPrompts(user.id, locale);

  return (
    <main className="container mx-auto px-4 py-8">
        {/* 페이지 타이틀 */}
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        {/* 구매한 프롬프트 목록 */}
        {purchasedPrompts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">{t('emptyMessage')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purchasedPrompts.map((prompt) => (
              <LibraryCard
                key={prompt.orderId}
                prompt={prompt}
                locale={locale}
              />
            ))}
          </div>
        )}
      </main>
  );
}


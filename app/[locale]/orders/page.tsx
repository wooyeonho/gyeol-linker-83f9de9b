import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/routing';
import { Metadata } from 'next';
import { ShoppingBag, Calendar, DollarSign, Download, Eye } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

/**
 * 주문 정보 타입
 */
interface OrderItem {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded';
  created_at: string;
  prompt: {
    id: string;
    slug: string;
    title_ko: string;
    title_en: string;
    thumbnail_url: string;
  };
}

/**
 * 주문 목록 조회
 */
async function fetchOrders(userId: string, locale: string): Promise<OrderItem[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      amount,
      status,
      created_at,
      prompts!inner (
        id,
        slug,
        title_ko,
        title_en,
        thumbnail_url
      )
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error || !orders) {
    return [];
  }

  return orders.map((order: any) => ({
    id: order.id,
    amount: order.amount,
    status: order.status,
    created_at: order.created_at,
    prompt: {
      id: order.prompts.id,
      slug: order.prompts.slug,
      title_ko: order.prompts.title_ko,
      title_en: order.prompts.title_en,
      thumbnail_url: order.prompts.thumbnail_url,
    },
  }));
}

/**
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('orders');

  return {
    title: t('title'),
    description: t('title'),
  };
}

/**
 * 주문 목록 컴포넌트
 */
async function OrdersList({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const orders = await fetchOrders(user.id, locale);
  const t = await getTranslations('orders');

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">{t('emptyMessage')}</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: t('pending'),
    completed: t('completed'),
    refunded: t('refunded'),
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-primary/20 text-primary',
    refunded: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const title = locale === 'ko' ? order.prompt.title_ko : order.prompt.title_en;
        const orderDate = new Date(order.created_at).toLocaleDateString(
          locale === 'ko' ? 'ko-KR' : 'en-US',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        );

        return (
          <div
            key={order.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors"
          >
            <div className="flex gap-4">
              {/* 썸네일 */}
              <div className="relative w-20 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                {order.prompt.thumbnail_url ? (
                  <Image
                    src={order.prompt.thumbnail_url}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-gray-500" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{orderDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-2">
                {order.status === 'completed' && (
                  <>
                    <Link
                      href={`/${locale}/prompts/${order.prompt.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('viewPrompt')}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 구매 내역 페이지
 */
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('orders');
  const supabase = await createClient();

  // 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-400">구매한 프롬프트 목록을 확인하세요</p>
        </div>

        {/* 주문 목록 */}
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-800 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 bg-gray-800 rounded w-3/4" />
                      <div className="h-4 bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <OrdersList locale={locale} />
        </Suspense>
      </div>
    </main>
  );
}




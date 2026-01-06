import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PromptCard, { PromptCardData } from '@/components/PromptCard';
import { Star, ShoppingBag, Calendar, User } from 'lucide-react';

/**
 * 판매자 정보 타입
 */
interface SellerInfo {
  id: string;
  username: string;
  name: string | null;
  email: string;
  created_at: string;
  total_sales: number;
  average_rating: number;
}

/**
 * 판매자 정보 조회
 */
async function fetchSellerInfo(
  username: string
): Promise<SellerInfo | null> {
  const supabase = await createClient();

  // 판매자 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, name, email, created_at')
    .eq('username', username)
    .single();

  if (error || !profile) {
    return null;
  }

  // 판매자의 프롬프트 ID 목록 조회
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, average_rating')
    .eq('seller_id', profile.id)
    .eq('status', 'approved')
    .is('deleted_at', null);

  const promptIds = prompts?.map((p) => p.id) || [];

  // 총 판매량 계산
  let totalSales = 0;
  if (promptIds.length > 0) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('prompt_id', promptIds)
      .eq('status', 'completed');

    totalSales = count || 0;
  }

  // 평균 평점 계산
  const ratingsWithValue =
    prompts?.filter((p) => p.average_rating && p.average_rating > 0) || [];
  const averageRating =
    ratingsWithValue.length > 0
      ? ratingsWithValue.reduce(
          (sum, p) => sum + parseFloat(p.average_rating.toString()),
          0
        ) / ratingsWithValue.length
      : 0;

  return {
    id: profile.id,
    username: profile.username || '',
    name: profile.name,
    email: profile.email,
    created_at: profile.created_at,
    total_sales: totalSales,
    average_rating: averageRating,
  };
}

/**
 * 판매자의 승인된 프롬프트 조회
 */
async function fetchSellerPrompts(
  sellerId: string,
  locale: string
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !prompts) {
    return [];
  }

  return prompts.map((prompt: any) => {
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
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const seller = await fetchSellerInfo(username);

  if (!seller) {
    return {
      title: '판매자를 찾을 수 없습니다',
    };
  }

  const sellerName = seller.name || seller.username;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com';
  const url = `${baseUrl}/${locale}/seller/${username}`;

  return {
    title: `${sellerName} | 판매자 프로필 | 프롬프트 정음`,
    description: `${sellerName}의 프롬프트를 확인해보세요. 총 ${seller.total_sales}개의 판매 실적을 보유한 판매자입니다.`,
    openGraph: {
      type: 'profile',
      title: `${sellerName} | 판매자 프로필`,
      description: `총 ${seller.total_sales}개의 판매 실적`,
      url,
      siteName: '프롬프트 정음',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
    },
    twitter: {
      card: 'summary',
      title: `${sellerName} | 판매자 프로필`,
      description: `총 ${seller.total_sales}개의 판매 실적`,
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * 공개 판매자 페이지
 */
export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations('seller');
  const tCommon = await getTranslations('common');

  // 판매자 정보 조회
  const seller = await fetchSellerInfo(username);

  if (!seller) {
    notFound();
  }

  // 판매자의 프롬프트 조회
  const prompts = await fetchSellerPrompts(seller.id, locale);

  // 가입일 포맷팅
  const memberSince = new Date(seller.created_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
    }
  );

  // 아바타 이니셜 생성
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <main className="container mx-auto px-4 py-24 max-w-7xl">
        {/* 판매자 프로필 헤더 */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-[32px] p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* 아바타 */}
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-2 border-primary/30">
              {getInitials(seller.name, seller.email)}
            </div>

            {/* 판매자 정보 */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {seller.name || seller.username}
              </h1>
              <p className="text-gray-400 mb-6">@{seller.username}</p>

              {/* 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 총 판매량 */}
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-400">{t('totalSales')}</p>
                    <p className="text-2xl font-bold text-white">
                      {seller.total_sales.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 평균 평점 */}
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <div>
                    <p className="text-sm text-gray-400">{t('averageRating')}</p>
                    <p className="text-2xl font-bold text-white">
                      {seller.average_rating > 0
                        ? seller.average_rating.toFixed(1)
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 가입일 */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-400">{t('memberSince')}</p>
                    <p className="text-2xl font-bold text-white">{memberSince}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프롬프트 목록 */}
        <div>
          <h2 className="text-2xl font-bold mb-6">{t('sellerPrompts')}</h2>

          {prompts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">{t('noPrompts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {prompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </div>
      </main>
  );
}


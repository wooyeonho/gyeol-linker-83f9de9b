import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  Wallet,
  ShoppingBag,
  DollarSign,
  Eye,
  TrendingUp,
  Star,
  BarChart3,
} from 'lucide-react';
import SalesTrendChart, {
  DailySalesData,
} from './SalesTrendChart';
import { formatPrice } from '@/lib/utils/currency';

/**
 * 판매자 대시보드 요약 데이터 타입
 */
interface DashboardSummary {
  balance: number;
  totalSales: number;
  totalRevenue: number;
  totalViews: number;
  averageRating: number;
  conversionRate: number;
}

/**
 * 프롬프트 목록 아이템 타입
 */
interface PromptItem {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  status: 'pending' | 'approved' | 'rejected';
  price: number;
  view_count: number;
  purchase_count: number;
  average_rating: number;
  created_at: string;
  conversion_rate: number;
  total_revenue: number;
}

/**
 * 요약 데이터 조회
 */
async function fetchDashboardSummary(
  sellerId: string
): Promise<DashboardSummary> {
  const supabase = await createClient();

  // 1. 현재 잔액 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', sellerId)
    .single();

  const balance = profile?.balance || 0;

  // 2. 판매자의 프롬프트 조회 (조회수, 평점 포함)
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, view_count, average_rating')
    .eq('seller_id', sellerId)
    .is('deleted_at', null);

  const promptIds = prompts?.map((p) => p.id) || [];
  const totalViews =
    prompts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

  // 평균 평점 계산 (0이 아닌 평점만 평균 계산)
  const ratingsWithValue =
    prompts?.filter((p) => p.average_rating && p.average_rating > 0) || [];
  const averageRating =
    ratingsWithValue.length > 0
      ? ratingsWithValue.reduce(
          (sum, p) => sum + parseFloat(p.average_rating.toString()),
          0
        ) / ratingsWithValue.length
      : 0;

  // 3. 총 판매수 및 총 수익 조회
  let totalSales = 0;
  let totalRevenue = 0;

  if (promptIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('seller_revenue')
      .in('prompt_id', promptIds)
      .eq('status', 'completed');

    totalSales = orders?.length || 0;
    totalRevenue =
      orders?.reduce((sum, order) => sum + parseFloat(order.seller_revenue), 0) ||
      0;
  }

  // 4. 전체 전환율 계산
  const conversionRate =
    totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  return {
    balance: parseFloat(balance.toString()),
    totalSales,
    totalRevenue,
    totalViews,
    averageRating,
    conversionRate,
  };
}

/**
 * 최근 7일간 매출 추이 데이터 조회
 */
async function fetchSalesTrend(
  sellerId: string
): Promise<DailySalesData[]> {
  const supabase = await createClient();

  // 판매자의 프롬프트 ID 목록 조회
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .eq('seller_id', sellerId)
    .is('deleted_at', null);

  const promptIds = prompts?.map((p) => p.id) || [];

  if (promptIds.length === 0) {
    // 최근 7일 날짜 배열 생성 (빈 데이터)
    const dates: DailySalesData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        sales: 0,
        revenue: 0,
      });
    }
    return dates;
  }

  // 최근 7일간 주문 조회
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, seller_revenue')
    .in('prompt_id', promptIds)
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo.toISOString());

  // 날짜별로 그룹화
  const dailyData: { [key: string]: { sales: number; revenue: number } } = {};

  // 최근 7일 날짜 초기화
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = { sales: 0, revenue: 0 };
  }

  // 주문 데이터 집계
  orders?.forEach((order) => {
    const orderDate = new Date(order.created_at);
    const dateKey = orderDate.toISOString().split('T')[0];

    if (dailyData[dateKey]) {
      dailyData[dateKey].sales += 1;
      dailyData[dateKey].revenue += parseFloat(order.seller_revenue);
    }
  });

  // 배열로 변환
  const result: DailySalesData[] = Object.keys(dailyData)
    .sort()
    .map((date) => ({
      date,
      sales: dailyData[date].sales,
      revenue: dailyData[date].revenue,
    }));

  return result;
}

/**
 * 프롬프트 목록 조회 (수익 포함)
 */
async function fetchSellerPrompts(
  sellerId: string,
  locale: string
): Promise<PromptItem[]> {
  const supabase = await createClient();

  const { data: prompts, error } = await supabase
    .from('prompts')
    .select(
      'id, slug, title_ko, title_en, status, price, view_count, purchase_count, average_rating, created_at'
    )
    .eq('seller_id', sellerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !prompts) {
    return [];
  }

  // 각 프롬프트별 수익 조회
  const promptIds = prompts.map((p) => p.id);
  const { data: orders } = await supabase
    .from('orders')
    .select('prompt_id, seller_revenue')
    .in('prompt_id', promptIds)
    .eq('status', 'completed');

  // 프롬프트별 수익 집계
  const revenueMap: { [key: string]: number } = {};
  orders?.forEach((order) => {
    const promptId = order.prompt_id;
    revenueMap[promptId] =
      (revenueMap[promptId] || 0) + parseFloat(order.seller_revenue);
  });

  return prompts.map((prompt) => {
    const viewCount = prompt.view_count || 0;
    const purchaseCount = prompt.purchase_count || 0;
    const conversionRate =
      viewCount > 0 ? (purchaseCount / viewCount) * 100 : 0;

    return {
      id: prompt.id,
      slug: prompt.slug,
      title_ko: prompt.title_ko,
      title_en: prompt.title_en,
      status: prompt.status,
      price: parseFloat(prompt.price),
      view_count: viewCount,
      purchase_count: purchaseCount,
      average_rating: parseFloat(prompt.average_rating?.toString() || '0'),
      created_at: prompt.created_at,
      conversion_rate: conversionRate,
      total_revenue: revenueMap[prompt.id] || 0,
    };
  });
}

/**
 * 판매자 대시보드 페이지
 */
export default async function SellerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');

  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 2. 프로필 및 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return (
      <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('accessDenied')}</h1>
            <p className="text-gray-400">
              판매자 권한이 필요합니다. 관리자에게 문의하세요.
            </p>
          </div>
        </main>
    );
  }

  // 3. 데이터 조회
  const summary = await fetchDashboardSummary(profile.id);
  const salesTrend = await fetchSalesTrend(profile.id);
  const prompts = await fetchSellerPrompts(profile.id, locale);

  // 상태 라벨 및 색상
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: t('pending'), color: 'text-yellow-400 bg-yellow-400/10' };
      case 'approved':
        return { label: t('approved'), color: 'text-green-400 bg-green-400/10' };
      case 'rejected':
        return { label: t('rejected'), color: 'text-red-400 bg-red-400/10' };
      default:
        return { label: status, color: 'text-gray-400 bg-gray-400/10' };
    }
  };

  return (
    <main className="container mx-auto px-4 py-24 max-w-7xl">
        {/* 페이지 타이틀 */}
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        {/* 요약 위젯 - 6개 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 현재 잔액 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('balance')}</h2>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
                        <p className="text-3xl font-bold text-primary">
                          {formatPrice(summary.balance)}
                        </p>
          </div>

          {/* 총 판매수 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('totalSales')}</h2>
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-white">
              {summary.totalSales.toLocaleString()}
            </p>
          </div>

          {/* 총 수익 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('totalRevenue')}</h2>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
                        <p className="text-3xl font-bold text-green-400">
                          {formatPrice(summary.totalRevenue)}
                        </p>
          </div>

          {/* 총 조회수 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('totalViews')}</h2>
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-white">
              {summary.totalViews.toLocaleString()}
            </p>
          </div>

          {/* 평균 평점 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('averageRating')}</h2>
              <Star className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {summary.averageRating > 0
                ? summary.averageRating.toFixed(1)
                : 'N/A'}
            </p>
          </div>

          {/* 전체 전환율 */}
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-400">{t('conversionRate')}</h2>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-primary">
              {summary.conversionRate.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* 매출 추이 차트 */}
        <div className="mb-8">
          <SalesTrendChart data={salesTrend} locale={locale} />
        </div>

        {/* 프롬프트 목록 */}
        <div className="bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold">{t('myPrompts')}</h2>
          </div>

          {prompts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>{t('noPrompts')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('promptTitle')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('status')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('price')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {t('views')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        {t('purchases')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('purchaseConversionRate')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('promptRevenue')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      {t('createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {prompts.map((prompt) => {
                    const statusInfo = getStatusLabel(prompt.status);
                    const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
                    const createdAt = new Date(prompt.created_at).toLocaleDateString(
                      locale === 'ko' ? 'ko-KR' : 'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    );

                    return (
                      <tr
                        key={prompt.id}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{title}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                  {formatPrice(prompt.price)}
                                                </td>
                        <td className="px-6 py-4 text-gray-300">
                          {prompt.view_count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {prompt.purchase_count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {prompt.conversion_rate.toFixed(2)}%
                        </td>
                                                <td className="px-6 py-4 text-green-400 font-medium">
                                                  {formatPrice(prompt.total_revenue)}
                                                </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {createdAt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
  );
}

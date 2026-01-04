import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { Users, ShoppingBag, FileText, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { Suspense } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { checkAdminAccess } from '@/lib/utils/auth';

/**
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('adminAnalytics');

  return {
    title: t('title'),
    description: t('title'),
  };
}

/**
 * 관리자 통계 대시보드 페이지
 */
export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('adminAnalytics');
  const supabase = await createClient();

  const redirectPath = `/${locale}`;

  // 관리자 권한 확인
  const { authorized } = await checkAdminAccess();
  if (!authorized) {
    redirect(redirectPath);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-gray-400">전체 플랫폼 통계를 확인하세요</p>
        </div>

        {/* 통계 대시보드 */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-800 rounded w-1/2 mb-4" />
                  <div className="h-8 bg-gray-800 rounded w-3/4" />
                </div>
              ))}
            </div>
          }
        >
          <AnalyticsDashboard locale={locale} />
        </Suspense>
      </div>
    </main>
  );
}


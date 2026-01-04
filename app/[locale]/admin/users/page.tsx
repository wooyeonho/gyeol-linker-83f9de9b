import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { Users, Search, Shield, User, ShoppingBag } from 'lucide-react';
import { Suspense } from 'react';
import UserManagementList from './UserManagementList';
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
  const t = await getTranslations('adminUsers');

  return {
    title: t('title'),
    description: t('title'),
  };
}

/**
 * 사용자 관리 페이지
 */
export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await params;
  const { search = '' } = await searchParams;
  const t = await getTranslations('adminUsers');
  const supabase = await createClient();

  const redirectPath = `/${locale}`;

  // 관리자 권한 확인
  const { authorized } = await checkAdminAccess();
  if (!authorized) {
    redirect(redirectPath);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-gray-400">사용자 역할을 관리하고 통계를 확인하세요</p>
        </div>

        {/* 검색 */}
        <div className="mb-6">
          <form method="get" action={`/${locale}/admin/users`} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label={t('search')}
            />
          </form>
        </div>

        {/* 사용자 목록 */}
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-800 rounded w-1/4" />
                      <div className="h-4 bg-gray-800 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <UserManagementList locale={locale} search={search} />
        </Suspense>
      </div>
    </main>
  );
}


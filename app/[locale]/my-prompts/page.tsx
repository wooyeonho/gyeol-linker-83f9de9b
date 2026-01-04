import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/routing';
import { Metadata } from 'next';
import { Plus, Edit, Trash2, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

/**
 * 프롬프트 정보 타입
 */
interface PromptItem {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  thumbnail_url: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  view_count: number;
  purchase_count: number;
  created_at: string;
}

/**
 * 프롬프트 목록 조회
 */
async function fetchMyPrompts(userId: string, locale: string): Promise<PromptItem[]> {
  const supabase = await createClient();

  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('id, slug, title_ko, title_en, thumbnail_url, price, status, view_count, purchase_count, created_at')
    .eq('seller_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !prompts) {
    return [];
  }

  return prompts;
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
  const t = await getTranslations('myPrompts');

  return {
    title: t('title'),
    description: t('title'),
  };
}

/**
 * 프롬프트 목록 컴포넌트
 */
async function PromptsList({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const prompts = await fetchMyPrompts(user.id, locale);
  const t = await getTranslations('myPrompts');
  const tDashboard = await getTranslations('dashboard');

  if (prompts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-6">{t('emptyMessage')}</p>
        <Link
          href={`/${locale}/seller/prompts/new`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('createPrompt')}
        </Link>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: {
      label: t('pending'),
      icon: Clock,
      color: 'bg-yellow-500/20 text-yellow-400',
    },
    approved: {
      label: t('approved'),
      icon: CheckCircle,
      color: 'bg-primary/20 text-primary',
    },
    rejected: {
      label: t('rejected'),
      icon: XCircle,
      color: 'bg-red-500/20 text-red-400',
    },
  };

  return (
    <div className="space-y-4">
      {prompts.map((prompt) => {
        const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
        const statusInfo = statusConfig[prompt.status];
        const StatusIcon = statusInfo.icon;

        return (
          <div
            key={prompt.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors"
          >
            <div className="flex gap-4">
              {/* 썸네일 */}
              <div className="relative w-24 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                {prompt.thumbnail_url ? (
                  <Image
                    src={prompt.thumbnail_url}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-500" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <span>${prompt.price.toFixed(2)}</span>
                  <span>{tDashboard('views')}: {prompt.view_count.toLocaleString()}</span>
                  <span>{tDashboard('purchases')}: {prompt.purchase_count.toLocaleString()}</span>
                </div>
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/prompts/${prompt.slug}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('view')}</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 내 프롬프트 관리 페이지
 */
export default async function MyPromptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('myPrompts');
  const supabase = await createClient();

  // 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 판매자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    redirect(`/${locale}`);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-gray-400">등록한 프롬프트를 관리하세요</p>
          </div>
          <Link
            href={`/${locale}/seller/prompts/new`}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('createPrompt')}
          </Link>
        </div>

        {/* 프롬프트 목록 */}
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-800 rounded-lg" />
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
          <PromptsList locale={locale} />
        </Suspense>
      </div>
    </main>
  );
}




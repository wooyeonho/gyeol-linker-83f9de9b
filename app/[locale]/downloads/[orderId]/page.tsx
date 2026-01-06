import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SuccessBanner from './SuccessBanner';
import PromptContent from '@/components/PromptContent';
import ImageGallery from '@/components/ImageGallery';
import { Download, Copy, CheckCircle, User, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

/**
 * 주문 및 프롬프트 정보 타입
 */
interface OrderPromptInfo {
  order: {
    id: string;
    status: string;
    created_at: string;
    download_count: number;
    amount: number;
  };
  prompt: {
    id: string;
    slug: string;
    title_ko: string;
    title_en: string;
    description_ko: string;
    description_en: string;
    content: string;
    ai_model: string;
    thumbnail_url: string;
    result_images: string[];
    result_video_url: string | null;
    instructions_ko: string | null;
    instructions_en: string | null;
  };
}

/**
 * 주문 및 프롬프트 정보 조회
 */
async function fetchOrderAndPrompt(
  orderId: string,
  userId: string,
  locale: string
): Promise<OrderPromptInfo | null> {
  const supabase = await createClient();

  // 주문 정보 조회 (프롬프트 정보 포함)
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      created_at,
      download_count,
      amount,
      prompt:prompts!orders_prompt_id_fkey(
        id,
        slug,
        title_ko,
        title_en,
        description_ko,
        description_en,
        content,
        ai_model,
        thumbnail_url,
        result_images,
        result_video_url,
        instructions_ko,
        instructions_en
      )
    `
    )
    .eq('id', orderId)
    .eq('buyer_id', userId)
    .single();

  if (orderError || !orderData || orderData.status !== 'completed') {
    return null;
  }

  const prompt = orderData.prompt as any;

  return {
    order: {
      id: orderData.id,
      status: orderData.status,
      created_at: orderData.created_at,
      download_count: orderData.download_count || 0,
      amount: parseFloat(orderData.amount),
    },
    prompt: {
      id: prompt.id,
      slug: prompt.slug,
      title_ko: prompt.title_ko,
      title_en: prompt.title_en,
      description_ko: prompt.description_ko,
      description_en: prompt.description_en,
      content: prompt.content || '',
      ai_model: prompt.ai_model,
      thumbnail_url: prompt.thumbnail_url,
      result_images: prompt.result_images || [],
      result_video_url: prompt.result_video_url,
      instructions_ko: prompt.instructions_ko,
      instructions_en: prompt.instructions_en,
    },
  };
}

/**
 * 다운로드 카운트 증가
 */
async function incrementDownloadCount(orderId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // 현재 다운로드 카운트 조회
  const { data: order } = await supabase
    .from('orders')
    .select('download_count')
    .eq('id', orderId)
    .eq('buyer_id', userId)
    .single();

  if (order) {
    // 다운로드 카운트 증가
    await supabase
      .from('orders')
      .update({ download_count: (order.download_count || 0) + 1 })
      .eq('id', orderId)
      .eq('buyer_id', userId);
  }
}

/**
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}): Promise<Metadata> {
  const { locale, orderId } = await params;
  const t = await getTranslations('downloads');

  return {
    title: t('title'),
    description: t('description'),
  };
}

/**
 * 다운로드 페이지 서버 액션
 */
async function handleDownload(orderId: string) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다.' };
  }

  // 다운로드 카운트 증가
  await incrementDownloadCount(orderId, user.id);

  return { success: true };
}


/**
 * 다운로드 페이지
 */
export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const t = await getTranslations('downloads');
  const tCommon = await getTranslations('common');
  const supabase = await createClient();

  // 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 주문 및 프롬프트 정보 조회
  const data = await fetchOrderAndPrompt(orderId, user.id, locale);

  if (!data) {
    notFound();
  }

  const { order, prompt } = data;
  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;
  const instructions =
    locale === 'ko' ? prompt.instructions_ko : prompt.instructions_en;

  const downloadAction = handleDownload.bind(null, orderId);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-5xl">
        {/* 성공 배너 */}
        <SuccessBanner
          title={t('successTitle') || '구매 완료!'}
          message={
            t('successMessage') ||
            '프롬프트를 다운로드하고 사용하실 수 있습니다.'
          }
        />

        {/* 프롬프트 정보 카드 */}
        <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{title}</h1>
              <p className="text-gray-400 line-clamp-2">{description}</p>
            </div>
            <Link
              href={`/${locale}/prompts/${prompt.slug}`}
              className="px-6 py-3 bg-primary hover:bg-primary/90 rounded-lg font-medium transition-colors text-center"
            >
              {tCommon('viewDetails') || '상세보기'}
            </Link>
          </div>

          {/* 메타 정보 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{t('orderDate') || '주문일'}:</span>
              <span className="text-white">
                {new Date(order.created_at).toLocaleDateString(
                  locale === 'ko' ? 'ko-KR' : 'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>{t('downloadCount') || '다운로드'}:</span>
              <span className="text-white">{order.download_count}회</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">
                {t('statusCompleted') || '구매 완료'}
              </span>
            </div>
          </div>
        </div>

        {/* 이미지 갤러리 */}
        {prompt.result_images && prompt.result_images.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {t('resultGallery') || '결과물 갤러리'}
            </h2>
            <ImageGallery
              thumbnail={prompt.thumbnail_url}
              images={prompt.result_images}
              videoUrl={prompt.result_video_url}
            />
          </div>
        )}

        {/* 사용 가이드 */}
        {instructions && (
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {t('instructions') || '사용 가이드'}
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap">{instructions}</p>
            </div>
          </div>
        )}

        {/* 프롬프트 원문 */}
        <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t('promptContent') || '프롬프트 원문'}
            </h2>
            <DownloadButton
              orderId={orderId}
              downloadAction={downloadAction}
              locale={locale}
            />
          </div>
          <PromptContent
            content={prompt.content}
            hasPurchased={true}
            price={order.amount}
            salesCount={0}
          />
        </div>

        {/* 안내 메시지 */}
        <div className="mt-8 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-gray-300">
            {t('downloadNote') ||
              '프롬프트를 복사하여 AI 도구에 붙여넣어 사용하실 수 있습니다.'}
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * 다운로드 버튼 클라이언트 컴포넌트
 */
async function DownloadButton({
  orderId,
  downloadAction,
  locale,
}: {
  orderId: string;
  downloadAction: () => Promise<{ error?: string; success?: boolean }>;
  locale: string;
}) {
  return (
    <form action={downloadAction}>
      <button
        type="submit"
        className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>다운로드</span>
      </button>
    </form>
  );
}

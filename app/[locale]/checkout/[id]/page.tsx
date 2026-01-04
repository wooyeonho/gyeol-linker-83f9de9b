import { getTranslations, getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import CheckoutForm from './CheckoutForm';
import { ShoppingBag, Lock, Shield } from 'lucide-react';
import Image from 'next/image';

/**
 * 프롬프트 정보 타입
 */
interface PromptInfo {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  thumbnail_url: string;
  price: number;
  ai_model: string;
}

/**
 * 프롬프트 정보 조회
 */
async function fetchPrompt(promptId: string, locale: string): Promise<PromptInfo | null> {
  const supabase = await createClient();

  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('id, slug, title_ko, title_en, description_ko, description_en, thumbnail_url, price, ai_model')
    .eq('id', promptId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .single();

  if (error || !prompt) {
    return null;
  }

  return prompt;
}

/**
 * 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const prompt = await fetchPrompt(id, locale);

  if (!prompt) {
    return {
      title: 'Checkout | Prompt Jeongeom',
    };
  }

  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;

  return {
    title: `${title} - Checkout`,
    description: description,
    openGraph: {
      title: `${title} - Checkout`,
      description: description,
      images: [prompt.thumbnail_url],
    },
  };
}

/**
 * 결제 페이지
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('checkout');
  const tCommon = await getTranslations('common');
  const supabase = await createClient();

  // 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 프롬프트 정보 조회
  const prompt = await fetchPrompt(id, locale);

  if (!prompt) {
    notFound();
  }

  // 중복 구매 체크
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('prompt_id', id)
    .eq('status', 'completed')
    .single();

  if (existingOrder) {
    redirect(`/${locale}/prompts/${prompt.slug}`);
  }

  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 프롬프트 정보 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">{t('orderSummary')}</h2>
              
              {/* 프롬프트 카드 */}
              <div className="flex gap-4">
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
                      <ShoppingBag className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{prompt.ai_model}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${prompt.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* 보안 정보 */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">{t('securePayment')}</h3>
                  <p className="text-sm text-gray-400">{t('securePaymentDescription')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 결제 폼 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CheckoutForm promptId={id} price={prompt.price} slug={prompt.slug} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


'use client';

import { ShoppingCart, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { createOrder } from '@/app/actions/orders';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

/**
 * 구매 사이드바 컴포넌트
 * Sticky 위치에 가격 및 구매 버튼
 */
export default function PurchaseSidebar({
  promptId,
  price,
  hasPurchased,
  slug,
}: {
  promptId: string;
  price: number;
  hasPurchased: boolean;
  slug?: string;
}) {
  const t = useTranslations('prompts');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (isProcessing) return;

    // 결제 페이지로 리다이렉트
    if (slug) {
      router.push(`/${locale}/checkout/${promptId}`);
    } else {
      // slug가 없으면 직접 구매 처리 (기존 방식)
      setIsProcessing(true);

      try {
        const result = await createOrder(promptId, price);

        if (result.error) {
          addToast({ type: 'error', message: result.error });
          setIsProcessing(false);
          return;
        }

        // 성공 시 페이지 갱신
        addToast({ type: 'success', message: t('purchaseSuccess') });
        if (result.slug) {
          router.push(`/${locale}/prompts/${result.slug}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        console.error('구매 오류:', error);
        addToast({ type: 'error', message: t('purchaseFailed') });
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="sticky top-24 bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
      {/* 가격 */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">{tCommon('price')}</p>
        <p className="text-3xl font-bold text-primary">
          ${price.toFixed(2)}
        </p>
      </div>

      {/* 구매 버튼 */}
      {!hasPurchased ? (
        <motion.button
          onClick={handlePurchase}
          disabled={isProcessing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isProcessing ? t('purchaseProcessing') : t('buyNow')}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>{t('purchaseProcessing')}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              <span>{t('buyNow')}</span>
            </>
          )}
        </motion.button>
      ) : (
        <div className="w-full px-6 py-3 bg-gray-800 text-gray-400 rounded-lg text-center" aria-label={t('purchaseCompleted')}>
          {t('purchaseCompleted')}
        </div>
      )}

      {/* 추가 정보 */}
      <div className="pt-4 border-t border-gray-800 space-y-2 text-sm text-gray-400">
        <p>• 즉시 다운로드 가능</p>
        <p>• 평생 사용 가능</p>
        <p>• 무제한 업데이트</p>
      </div>
    </div>
  );
}


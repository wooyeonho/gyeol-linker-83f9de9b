'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { createOrder } from '@/app/actions/orders';
import { ShoppingCart, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { formatPrice, calculateEarnings } from '@/lib/utils/currency';

/**
 * 결제 폼 컴포넌트
 */
export default function CheckoutForm({
  promptId,
  price,
  slug,
}: {
  promptId: string;
  price: number;
  slug: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const result = await createOrder(promptId, price);

      if (result.error) {
        addToast({ type: 'error', message: result.error });
        setIsProcessing(false);
        return;
      }

      // 성공 시 프롬프트 상세 페이지로 리다이렉트
      addToast({ type: 'success', message: t('success') });
      router.push(`/${locale}/prompts/${slug}`);
      router.refresh();
    } catch (error) {
      console.error('결제 오류:', error);
      addToast({ type: 'error', message: t('failed') });
      setIsProcessing(false);
    }
  };

  // 수수료 계산
  const earnings = calculateEarnings(price);

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 space-y-6">
      {/* 가격 정보 */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{tCommon('price')}</span>
          <span className="text-white">{earnings.formattedTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{t('platformFee')}</span>
          <span className="text-gray-400">{earnings.formattedPlatform}</span>
        </div>
        <div className="pt-3 border-t border-gray-800 flex justify-between">
          <span className="font-semibold">{t('total')}</span>
          <span className="text-2xl font-bold text-primary">{earnings.formattedTotal}</span>
        </div>
      </div>

      {/* 결제 버튼 */}
      <motion.button
        type="submit"
        disabled={isProcessing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-600 hover:brightness-110 text-white rounded-[32px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        aria-label={t('completePurchase')}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>{t('processing')}</span>
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" aria-hidden="true" />
            <span>{t('completePurchase')}</span>
          </>
        )}
      </motion.button>

      {/* 보안 안내 */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>• {t('secureTransaction')}</p>
        <p>• {t('instantAccess')}</p>
        <p>• {t('lifetimeAccess')}</p>
      </div>
    </form>
  );
}


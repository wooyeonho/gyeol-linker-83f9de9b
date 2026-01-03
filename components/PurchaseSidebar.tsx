'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createOrder } from '@/app/actions/orders';

/**
 * 구매 사이드바 컴포넌트
 * Sticky 위치에 가격 및 구매 버튼
 */
export default function PurchaseSidebar({
  promptId,
  price,
  hasPurchased,
}: {
  promptId: string;
  price: number;
  hasPurchased: boolean;
}) {
  const t = useTranslations('prompts');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const result = await createOrder(promptId, price);

      if (result.error) {
        alert(result.error);
        setIsProcessing(false);
        return;
      }

      // 성공 시 페이지 갱신
      alert(t('purchaseSuccess'));
      router.refresh();
    } catch (error) {
      console.error('구매 오류:', error);
      alert(t('purchaseFailed'));
      setIsProcessing(false);
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
        <button
          onClick={handlePurchase}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-5 h-5" />
          {isProcessing ? t('purchaseProcessing') : t('buyNow')}
        </button>
      ) : (
        <div className="w-full px-6 py-3 bg-gray-800 text-gray-400 rounded-lg text-center">
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


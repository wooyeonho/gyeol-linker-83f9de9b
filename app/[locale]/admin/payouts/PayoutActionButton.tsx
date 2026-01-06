'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { completePayout } from '@/app/actions/admin';
import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * 정산 완료 버튼 컴포넌트
 */
export default function PayoutActionButton({
  payoutId,
}: {
  payoutId: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('admin');
  const [processing, setProcessing] = useState(false);

  const handleComplete = async () => {
    if (!confirm('정산을 완료하시겠습니까?')) {
      return;
    }

    setProcessing(true);

    try {
      const result = await completePayout(payoutId);

      if (result.error) {
        alert(result.error);
        setProcessing(false);
        return;
      }

      alert(t('success'));
      router.refresh();
    } catch (error) {
      console.error('정산 완료 오류:', error);
      alert(t('failed'));
      setProcessing(false);
    }
  };

  return (
    <button
      onClick={handleComplete}
      disabled={processing}
      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 hover:brightness-110 rounded-[32px] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg shadow-primary/20"
    >
      {processing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('completing')}</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('complete')}</span>
        </>
      )}
    </button>
  );
}



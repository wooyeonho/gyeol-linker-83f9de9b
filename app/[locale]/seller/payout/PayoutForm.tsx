'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { requestPayout } from '@/app/actions/payouts';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';

/**
 * 출금 신청 폼 컴포넌트
 */
export default function PayoutForm({
  balance,
  locale,
}: {
  balance: number;
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations('payout');
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const MINIMUM_AMOUNT = 10;
  const amountNum = parseFloat(amount) || 0;
  const canRequest = balance >= MINIMUM_AMOUNT && amountNum >= MINIMUM_AMOUNT && amountNum <= balance && payoutMethod.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canRequest) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await requestPayout(amountNum, payoutMethod.trim());

      if (result.error) {
        alert(result.error);
        setSubmitting(false);
        return;
      }

      alert(t('success'));
      // 폼 초기화
      setAmount('');
      setPayoutMethod('');
      router.refresh();
    } catch (error) {
      console.error('출금 신청 오류:', error);
      alert(t('failed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
      <h2 className="text-xl font-semibold mb-6">{t('requestPayout')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 출금 금액 입력 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('amount')} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min={MINIMUM_AMOUNT}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('amountPlaceholder')}
            />
          </div>
          {amountNum > 0 && amountNum < MINIMUM_AMOUNT && (
            <p className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t('minimumAmount')}
            </p>
          )}
          {amountNum > balance && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t('insufficientBalance')}
            </p>
          )}
        </div>

        {/* 출금 방법 입력 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('payoutMethod')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder={t('payoutMethodPlaceholder')}
          />
        </div>

        {/* 잔액 부족 안내 */}
        {balance < MINIMUM_AMOUNT && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-[24px] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-1">
                  {t('insufficientBalance')}
                </p>
                <p className="text-sm text-gray-400">
                  출금 가능한 잔액이 부족합니다. 최소 출금 금액은 ${MINIMUM_AMOUNT}입니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={!canRequest || submitting || balance < MINIMUM_AMOUNT}
          className="w-full px-6 py-3 bg-primary hover:bg-primary-600 hover:brightness-110 rounded-[32px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('submitting')}</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>{t('submit')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}



'use client';

import { useTranslations } from 'next-intl';
import { Clock, CheckCircle2 } from 'lucide-react';

/**
 * 출금 내역 타입
 */
interface PayoutItem {
  id: string;
  amount: number;
  status: 'pending' | 'completed';
  payout_method: string;
  requested_at: string;
  completed_at: string | null;
}

/**
 * 출금 내역 컴포넌트
 */
export default function PayoutHistory({
  payouts,
  locale,
}: {
  payouts: PayoutItem[];
  locale: string;
}) {
  const t = useTranslations('payout');

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: t('pending'),
          color: 'text-yellow-400 bg-yellow-400/10',
          icon: Clock,
        };
      case 'completed':
        return {
          label: t('completed'),
          color: 'text-green-400 bg-green-400/10',
          icon: CheckCircle2,
        };
      default:
        return {
          label: status,
          color: 'text-gray-400 bg-gray-400/10',
          icon: Clock,
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">{t('payoutHistory')}</h2>

      {payouts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => {
            const statusInfo = getStatusLabel(payout.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={payout.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3"
              >
                {/* 금액 및 상태 */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    ${payout.amount.toFixed(2)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>

                {/* 출금 방법 */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('method')}</p>
                  <p className="text-sm text-gray-300">{payout.payout_method}</p>
                </div>

                {/* 날짜 */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('date')}</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(payout.requested_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



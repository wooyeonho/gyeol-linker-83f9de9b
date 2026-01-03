import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { completePayout } from '@/app/actions/admin';
import PayoutActionButton from './PayoutActionButton';
import { DollarSign, Calendar, User, CreditCard } from 'lucide-react';

/**
 * 관리자 이메일 (환경 변수로 설정 가능)
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

/**
 * 출금 요청 타입
 */
interface PayoutRequest {
  id: string;
  seller_id: string;
  seller_name: string | null;
  seller_email: string;
  amount: number;
  payout_method: string;
  requested_at: string;
}

/**
 * 대기 중인 출금 요청 조회
 */
async function fetchPendingPayouts(): Promise<PayoutRequest[]> {
  const supabase = await createClient();

  // 관리자 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return [];
  }

  // 대기 중인 출금 요청 조회 (판매자 정보 포함)
  const { data: payouts, error } = await supabase
    .from('payouts')
    .select(
      `
      id,
      seller_id,
      amount,
      payout_method,
      requested_at,
      seller:profiles!payouts_seller_id_fkey(name, email)
    `
    )
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error || !payouts) {
    console.error('출금 요청 조회 오류:', error);
    return [];
  }

  return payouts.map((payout: any) => ({
    id: payout.id,
    seller_id: payout.seller_id,
    seller_name: (payout.seller as any)?.name || null,
    seller_email: (payout.seller as any)?.email || '',
    amount: parseFloat(payout.amount),
    payout_method: payout.payout_method,
    requested_at: payout.requested_at,
  }));
}

/**
 * 관리자 정산 승인 페이지
 */
export default async function AdminPayoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 2. 관리자 권한 확인 (이메일 + role)
  if (user.email !== ADMIN_EMAIL) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-400">관리자 권한이 필요합니다.</p>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-400">관리자 권한이 필요합니다.</p>
        </div>
      </main>
    );
  }

  // 3. 대기 중인 출금 요청 조회
  const payouts = await fetchPendingPayouts();

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 페이지 타이틀 */}
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        {/* 출금 요청 목록 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold">{t('payoutRequests')}</h2>
          </div>

          {payouts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>{t('noPendingRequests')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t('seller')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {t('amount')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {t('payoutMethod')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('requestedAt')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">
                            {payout.seller_name || '판매자'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {payout.seller_email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-primary">
                          ${payout.amount.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {payout.payout_method}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {formatDate(payout.requested_at)}
                      </td>
                      <td className="px-6 py-4">
                        <PayoutActionButton payoutId={payout.id} locale={locale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
  );
}


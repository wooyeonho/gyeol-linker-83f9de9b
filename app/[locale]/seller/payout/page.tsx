import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PayoutForm from './PayoutForm';
import PayoutHistory from './PayoutHistory';

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
 * 현재 잔액 및 출금 내역 조회
 */
async function fetchPayoutData(sellerId: string) {
  const supabase = await createClient();

  // 1. 현재 잔액 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', sellerId)
    .single();

  const balance = profile?.balance || 0;

  // 2. 출금 내역 조회
  const { data: payouts, error } = await supabase
    .from('payouts')
    .select('id, amount, status, payout_method, requested_at, completed_at')
    .eq('seller_id', sellerId)
    .order('requested_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('출금 내역 조회 오류:', error);
    return { balance: parseFloat(balance.toString()), payouts: [] };
  }

  const payoutItems: PayoutItem[] = (payouts || []).map((payout: any) => ({
    id: payout.id,
    amount: parseFloat(payout.amount),
    status: payout.status,
    payout_method: payout.payout_method,
    requested_at: payout.requested_at,
    completed_at: payout.completed_at,
  }));

  return {
    balance: parseFloat(balance.toString()),
    payouts: payoutItems,
  };
}

/**
 * 출금 페이지
 */
export default async function PayoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('payout');
  const tDashboard = await getTranslations('dashboard');
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 2. 프로필 및 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{tDashboard('accessDenied')}</h1>
          <p className="text-gray-400">
            판매자 권한이 필요합니다. 관리자에게 문의하세요.
          </p>
        </div>
      </main>
    );
  }

  // 3. 데이터 조회
  const { balance, payouts } = await fetchPayoutData(profile.id);

  return (
    <main className="container mx-auto px-4 py-24 max-w-6xl">
        {/* 페이지 타이틀 */}
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 출금 신청 폼 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 출금 가능 잔액 강조 표시 */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-[32px] p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-300">
                  {t('availableBalance')}
                </h2>
              </div>
              <p className="text-5xl font-bold text-primary mb-2">
                ${balance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">
                {t('minimumAmount')}
              </p>
            </div>

            {/* 출금 신청 폼 */}
            <PayoutForm balance={balance} locale={locale} />
          </div>

          {/* 오른쪽: 출금 내역 */}
          <div className="lg:col-span-1">
            <PayoutHistory payouts={payouts} locale={locale} />
          </div>
        </div>
      </main>
  );
}


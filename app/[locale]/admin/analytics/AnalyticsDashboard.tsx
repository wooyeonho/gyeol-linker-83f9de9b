import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Users, ShoppingBag, FileText, DollarSign, TrendingUp } from 'lucide-react';

/**
 * 통계 데이터 타입
 */
interface AnalyticsData {
  totalUsers: number;
  totalSellers: number;
  totalPrompts: number;
  totalOrders: number;
  totalRevenue: number;
}

/**
 * 통계 데이터 조회
 */
async function fetchAnalytics(): Promise<AnalyticsData> {
  const supabase = await createClient();

  // 사용자 수
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // 판매자 수
  const { count: totalSellers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['seller', 'admin']);

  // 프롬프트 수
  const { count: totalPrompts } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  // 주문 수
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  // 총 수익
  const { data: orders } = await supabase
    .from('orders')
    .select('amount')
    .eq('status', 'completed');

  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.amount.toString()), 0) || 0;

  return {
    totalUsers: totalUsers || 0,
    totalSellers: totalSellers || 0,
    totalPrompts: totalPrompts || 0,
    totalOrders: totalOrders || 0,
    totalRevenue,
  };
}

/**
 * 통계 카드 컴포넌트
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-primary',
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 hover:border-primary transition-all hover:scale-[1.02]">
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

/**
 * 통계 대시보드 컴포넌트
 */
export default async function AnalyticsDashboard({ locale }: { locale: string }) {
  const analytics = await fetchAnalytics();
  const t = await getTranslations('adminAnalytics');

  return (
    <div className="space-y-8">
      {/* 주요 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          icon={Users}
          label={t('totalUsers')}
          value={analytics.totalUsers.toLocaleString()}
          color="text-primary"
        />
        <StatCard
          icon={ShoppingBag}
          label={t('totalSellers')}
          value={analytics.totalSellers.toLocaleString()}
          color="text-primary"
        />
        <StatCard
          icon={FileText}
          label={t('totalPrompts')}
          value={analytics.totalPrompts.toLocaleString()}
          color="text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label={t('totalOrders')}
          value={analytics.totalOrders.toLocaleString()}
          color="text-yellow-400"
        />
        <StatCard
          icon={DollarSign}
          label={t('totalRevenue')}
          value={`$${analytics.totalRevenue.toFixed(2)}`}
          color="text-primary"
        />
      </div>

      {/* 추가 통계 섹션 (향후 확장 가능) */}
            <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
              <h2 className="text-xl font-semibold mb-4">{t('recentOrders')}</h2>
        <p className="text-gray-400">최근 주문 통계는 향후 구현 예정입니다.</p>
      </div>
    </div>
  );
}





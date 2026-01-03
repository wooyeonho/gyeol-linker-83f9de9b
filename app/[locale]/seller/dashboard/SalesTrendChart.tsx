'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslations } from 'next-intl';

/**
 * 일별 매출 데이터 타입
 */
export interface DailySalesData {
  date: string;
  sales: number;
  revenue: number;
}

/**
 * 매출 추이 차트 컴포넌트
 */
export default function SalesTrendChart({
  data,
  locale,
}: {
  data: DailySalesData[];
  locale: string;
}) {
  const t = useTranslations('dashboard');

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
  };

  // 툴팁 커스터마이징
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-400 mb-2">
            {payload[0].payload.date
              ? formatDate(payload[0].payload.date)
              : ''}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name === 'sales'
                ? `${t('dailySales')}: ${entry.value}`
                : `${t('dailyRevenue')}: $${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">{t('salesTrend')}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={formatDate}
          />
          <YAxis
            yAxisId="left"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            label={{
              value: t('dailySales'),
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#9CA3AF' },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#00A86B"
            tick={{ fill: '#00A86B' }}
            label={{
              value: t('dailyRevenue'),
              angle: 90,
              position: 'insideRight',
              style: { fill: '#00A86B' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#9CA3AF' }}
            iconType="line"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sales"
            name={t('dailySales')}
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name={t('dailyRevenue')}
            stroke="#00A86B"
            strokeWidth={2}
            dot={{ fill: '#00A86B', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}



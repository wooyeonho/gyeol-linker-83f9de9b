'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SalesTrendData {
  name: string;
  sales: number;
  revenue: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[];
  defaultRange?: '7d' | '30d' | '90d';
}

export function SalesTrendChart({
  data,
  defaultRange = '30d',
}: SalesTrendChartProps) {
  const t = useTranslations('seller.dashboard');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>(defaultRange);

  const ranges = [
    { key: '7d' as const, label: '7D' },
    { key: '30d' as const, label: '30D' },
    { key: '90d' as const, label: '90D' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-4"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t('salesTrend')}
      </h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              range === r.key
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="w-full h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#E5E7EB' }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#00A86B"
              strokeWidth={2}
              dot={{ fill: '#00A86B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}




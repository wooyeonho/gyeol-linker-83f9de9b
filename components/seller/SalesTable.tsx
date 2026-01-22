'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Sale {
  id: string;
  date: string;
  promptTitle: string;
  promptSlug: string;
  price: number;
  revenue: number;
}

interface SalesTableProps {
  sales: Sale[];
  showViewAll?: boolean;
}

export function SalesTable({ sales, showViewAll = true }: SalesTableProps) {
  const t = useTranslations('seller.dashboard');

  if (sales.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-4"
      >
        <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
          {t('recentSales')}
        </h2>
        <p className="text-gray-400 text-center py-8">
          {t('noSalesYet')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-4"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t('recentSales')}
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-gray-300">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase tracking-wide">
              <th className="py-3 px-4 font-medium">{t('date')}</th>
              <th className="py-3 px-4 font-medium">{t('promptTitle')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('price')}</th>
              <th className="py-3 px-4 font-medium text-right">
                {t('yourRevenue')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors"
              >
                <td className="py-3 px-4 text-sm">{sale.date}</td>
                <td className="py-3 px-4 text-sm font-medium text-white">
                  <Link
                    href={`/prompts/${sale.promptSlug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {sale.promptTitle}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  ₩{Math.floor(sale.price).toLocaleString('ko-KR')}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-primary">
                  ₩{Math.floor(sale.revenue).toLocaleString('ko-KR')}{' '}
                  <span className="text-gray-400 text-xs">(80%)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showViewAll && (
        <Link
          href="/seller/sales"
          className="block text-center text-primary hover:underline mt-6 text-sm"
        >
          {t('viewAllSales')}
        </Link>
      )}
    </motion.div>
  );
}




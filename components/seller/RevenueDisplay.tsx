'use client';

import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface RevenueDisplayProps {
  amount: number;
}

export function RevenueDisplay({ amount }: RevenueDisplayProps) {
  const t = useTranslations('seller.dashboard');
  
  const amountDisplay = `₩${Math.floor(amount).toLocaleString('ko-KR')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
      <div>
        <p className="text-gray-400 uppercase text-sm tracking-wide mb-1">
          {t('totalRevenue')}
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-primary tracking-[-0.02em] flex items-center gap-2">
          <DollarSign size={36} className="text-primary" />
          {amountDisplay}
        </h2>
      </div>
      <Link
        href="/seller/payout"
        className="px-6 py-3 bg-primary text-white rounded-[32px] font-semibold hover:bg-primary/90 transition-all duration-200 min-h-[44px] flex items-center justify-center"
      >
        {t('withdraw')}
      </Link>
    </motion.div>
  );
}




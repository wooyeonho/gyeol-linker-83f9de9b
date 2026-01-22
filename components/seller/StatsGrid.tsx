'use client';

import { motion } from 'framer-motion';
import { Package, Star, TrendingUp, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StatsGridProps {
  totalSales: number;
  activePrompts: number;
  averageRating: number;
  sellerShare?: number;
}

export function StatsGrid({
  totalSales,
  activePrompts,
  averageRating,
  sellerShare = 80,
}: StatsGridProps) {
  const t = useTranslations('seller.dashboard');

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const stats = [
    {
      icon: TrendingUp,
      value: totalSales.toLocaleString('ko-KR'),
      label: t('totalSales'),
    },
    {
      icon: Package,
      value: activePrompts.toLocaleString('ko-KR'),
      label: t('activePrompts'),
    },
    {
      icon: Star,
      value: averageRating.toFixed(1),
      label: t('averageRating'),
    },
    {
      icon: Activity,
      value: `${sellerShare}%`,
      label: t('yourShare'),
    },
  ];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 text-center space-y-2"
          >
            <Icon size={28} className="text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-white tracking-[-0.02em]">
              {stat.value}
            </p>
            <p className="text-gray-400 uppercase text-xs tracking-wide">
              {stat.label}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}




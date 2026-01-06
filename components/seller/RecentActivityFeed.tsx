'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

interface RecentActivityFeedProps {
  activity: ActivityItem[];
  showViewAll?: boolean;
}

export function RecentActivityFeed({
  activity,
  showViewAll = true,
}: RecentActivityFeedProps) {
  const t = useTranslations('seller.dashboard');

  if (activity.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 space-y-4"
      >
        <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
          {t('recentActivity')}
        </h2>
        <p className="text-gray-400 text-center py-8">
          {t('noActivityYet')}
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
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 space-y-4"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t('recentActivity')}
      </h2>
      <ul className="space-y-3">
        {activity.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 text-sm text-gray-300"
          >
            <Activity
              size={16}
              className="text-gray-500 flex-shrink-0 mt-1"
            />
            <div className="flex-1">
              <p>{item.message}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.timestamp}</p>
            </div>
          </li>
        ))}
      </ul>
      {showViewAll && (
        <Link
          href="/seller/activity"
          className="block text-center text-primary hover:underline mt-6 text-sm"
        >
          {t('viewAllActivity')}
        </Link>
      )}
    </motion.div>
  );
}



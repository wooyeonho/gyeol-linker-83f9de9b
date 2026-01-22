'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

type StatusFilter = 'pending' | 'approved' | 'rejected';

interface FilterTabsProps {
  currentStatus: StatusFilter;
}

/**
 * 상태 필터 탭 컴포넌트
 * 모바일 퍼스트 디자인
 */
export default function FilterTabs({ currentStatus }: FilterTabsProps) {
  const t = useTranslations('admin.review');
  const router = useRouter();
  const searchParams = useSearchParams();

  const statuses: StatusFilter[] = ['pending', 'approved', 'rejected'];

  const handleStatusChange = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', status);
    router.push(`?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-2 mb-8 bg-gray-900 border border-gray-800 rounded-[32px] p-2"
    >
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => handleStatusChange(status)}
          className={`px-4 py-2 rounded-[24px] text-sm font-medium transition-colors w-1/3 min-h-[44px] ${
            currentStatus === status
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          aria-label={t(`status.${status}`)}
          aria-pressed={currentStatus === status}
        >
          {t(`status.${status}`)}
        </button>
      ))}
    </motion.div>
  );
}




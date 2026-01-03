'use client';

import { Flame, Star, DollarSign, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePathname } from 'next/navigation';

/**
 * 정렬 타입
 */
type SortType = 'popular' | 'rating' | 'sales' | 'newest';

/**
 * 정렬 탭 컴포넌트
 * URL 쿼리 파라미터로 정렬 상태 관리
 */
export default function SortTabs() {
  const t = useTranslations('home');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get('sort') || 'popular') as SortType;

  const handleSort = (sort: SortType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
      <button
        onClick={() => handleSort('popular')}
        className={`flex items-center gap-2 px-6 py-3 rounded-[32px] font-medium transition-all duration-200 active:scale-95 ${
          currentSort === 'popular'
            ? 'bg-primary text-white'
            : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
        }`}
      >
        <Flame className="w-4 h-4" />
        {t('sortPopular')}
      </button>

      <button
        onClick={() => handleSort('rating')}
        className={`flex items-center gap-2 px-6 py-3 rounded-[32px] font-medium transition-all duration-200 active:scale-95 ${
          currentSort === 'rating'
            ? 'bg-primary text-white'
            : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
        }`}
      >
        <Star className="w-4 h-4" />
        {t('sortRating')}
      </button>

      <button
        onClick={() => handleSort('sales')}
        className={`flex items-center gap-2 px-6 py-3 rounded-[32px] font-medium transition-all duration-200 active:scale-95 ${
          currentSort === 'sales'
            ? 'bg-primary text-white'
            : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
        }`}
      >
        <DollarSign className="w-4 h-4" />
        {t('sortSales')}
      </button>

      <button
        onClick={() => handleSort('newest')}
        className={`flex items-center gap-2 px-6 py-3 rounded-[32px] font-medium transition-all duration-200 active:scale-95 ${
          currentSort === 'newest'
            ? 'bg-primary text-white'
            : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {t('sortNewest')}
      </button>
    </div>
  );
}


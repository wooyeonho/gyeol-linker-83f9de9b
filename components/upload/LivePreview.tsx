'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  data: {
    title_ko?: string;
    title_en?: string;
    description_ko?: string;
    description_en?: string;
    price?: number;
    thumbnail_url?: string;
    category?: string;
    tags?: string;
  };
  locale?: string;
  className?: string;
}

/**
 * 실시간 프롬프트 미리보기 컴포넌트
 * 사용자가 입력한 데이터를 실시간으로 반영하여 마켓플레이스에서의 모습을 미리 확인
 */
export default function LivePreview({
  data,
  locale = 'ko',
  className,
}: LivePreviewProps) {
  const title = locale === 'ko' ? data.title_ko : data.title_en;
  const description = locale === 'ko' ? data.description_ko : data.description_en;
  const price = data.price || 0;
  const priceDisplay = `₩${Math.floor(price).toLocaleString('ko-KR')}`;
  const thumbnailUrl = data.thumbnail_url || '/placeholder_thumbnail.png';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-[32px] p-4 md:p-6 space-y-4',
        className
      )}
    >
      <h3 className="text-base md:text-lg font-semibold text-white tracking-[-0.02em]">
        Live Preview
      </h3>

      {/* 썸네일 */}
      <div className="relative w-full h-32 md:h-40 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={title || 'Prompt Thumbnail'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
            onError={(e) => {
              // 에러 시 플레이스홀더로 대체
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder_thumbnail.png';
            }}
          />
        )}
        {!thumbnailUrl && (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            No thumbnail
          </div>
        )}
      </div>

      {/* 제목 */}
      <h4 className="text-lg md:text-xl font-semibold text-white tracking-[-0.02em] line-clamp-2">
        {title || 'Untitled Prompt'}
      </h4>

      {/* 설명 */}
      <p className="text-gray-400 text-sm line-clamp-3 min-h-[3rem]">
        {description || 'A short description of your prompt.'}
      </p>

      {/* 가격 */}
      <div className="flex justify-between items-center text-white pt-2 border-t border-gray-800">
        <span className="text-sm md:text-base font-semibold">Price:</span>
        <span className="text-lg md:text-xl font-bold text-primary">
          {priceDisplay}
        </span>
      </div>

      {/* 카테고리 & 태그 (있는 경우) */}
      {(data.category || data.tags) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {data.category && (
            <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full">
              {data.category}
            </span>
          )}
          {data.tags &&
            data.tags
              .split(',')
              .slice(0, 3)
              .map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
        </div>
      )}
    </motion.div>
  );
}



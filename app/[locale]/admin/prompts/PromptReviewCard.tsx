'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/utils/date';
import PromptReviewActions from './PromptReviewActions';

interface PromptReviewCardData {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  price: number;
  thumbnail_url: string;
  ai_model: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  seller: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface PromptReviewCardProps {
  prompt: PromptReviewCardData;
  locale: string;
}

/**
 * 프롬프트 리뷰 카드 컴포넌트
 * 모바일 퍼스트 디자인, rounded-[32px] 스타일
 */
export default function PromptReviewCard({
  prompt,
  locale,
}: PromptReviewCardProps) {
  const t = useTranslations('admin.review');

  const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
  const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;
  const priceDisplay = `₩${parseInt(prompt.price.toString()).toLocaleString('ko-KR')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.01, boxShadow: '0 20px 25px -5px rgba(0, 168, 107, 0.1)' }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 space-y-4"
    >
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* 썸네일 */}
        <div className="relative w-full md:w-32 h-32 md:h-40 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
          {prompt.thumbnail_url ? (
            <Image
              src={prompt.thumbnail_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 128px"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 bg-gray-800">
              <span className="text-sm">이미지 없음</span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 space-y-2 min-w-0">
          <h3 className="text-xl md:text-2xl font-semibold text-white tracking-[-0.02em] break-words">
            {title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 break-words">
            {description}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
            {prompt.ai_model && <span>AI Model: {prompt.ai_model}</span>}
            <span className="font-semibold text-primary">{priceDisplay}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {prompt.seller && (
              <>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{prompt.seller.name || prompt.seller.email}</span>
                </div>
                <span>•</span>
              </>
            )}
            <span>
              {formatDate(prompt.created_at, { locale, includeTime: true })}
            </span>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      {prompt.status === 'pending' && (
        <div className="border-t border-gray-800 pt-6 mt-6">
          <PromptReviewActions promptId={prompt.id} status={prompt.status} />
        </div>
      )}
    </motion.div>
  );
}


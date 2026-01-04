'use client';

import { memo } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { motion } from 'framer-motion';

/**
 * 프롬프트 카드 타입
 */
export interface PromptCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  tags: string[];
  aiModel: string;
  rating: number;
  price: number;
  viewCount?: number;
  purchaseCount?: number;
  createdAt?: string;
}

/**
 * 프롬프트 카드 컴포넌트
 * React.memo로 최적화하여 불필요한 리렌더링 방지
 */
const PromptCard = memo(function PromptCard({
  prompt,
  priority = false,
}: {
  prompt: PromptCardData;
  priority?: boolean;
}) {
  const t = useTranslations('prompts');
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link 
        href={`/${locale}/prompts/${prompt.slug}`} 
        className="block"
        aria-label={`${prompt.title} - ${t('viewDetails')}`}
      >
        <article 
          className="group relative bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer shadow-xl shadow-primary/5"
          itemScope
          itemType="https://schema.org/Product"
        >
      {/* 썸네일 */}
      <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden rounded-t-[32px]">
        {prompt.thumbnail ? (
          <Image
            src={prompt.thumbnail}
            alt={prompt.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" role="img" aria-label="썸네일 없음">
            <Sparkles className="w-16 h-16 text-primary/30" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-6 md:p-8 space-y-3">
        {/* 제목 */}
        <h3 className="text-lg font-semibold text-white line-clamp-2" itemProp="name">
          {prompt.title}
        </h3>

        {/* 설명 */}
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed" itemProp="description">
          {prompt.description}
        </p>

        {/* 태그 */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {prompt.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <div className="flex items-center gap-3">
            {/* AI 모델 */}
            <span className="text-xs text-gray-500" aria-label={`AI 모델: ${prompt.aiModel}`}>
              {prompt.aiModel}
            </span>
            
            {/* 평점 */}
            <div className="flex items-center gap-1" aria-label={`평점: ${prompt.rating.toFixed(1)}점`}>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
              <span className="text-xs text-gray-400">{prompt.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* 가격 */}
          <span 
            className="text-lg font-bold text-primary" 
            aria-label={`가격: $${prompt.price.toFixed(2)}`}
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <meta itemProp="price" content={prompt.price.toFixed(2)} />
            <meta itemProp="priceCurrency" content="USD" />
            ${prompt.price.toFixed(2)}
          </span>
        </div>
      </div>
      </article>
    </Link>
    </motion.div>
  );
});

export default PromptCard;


'use client';

import { Star, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

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
 */
export default function PromptCard({
  prompt,
  priority = false,
}: {
  prompt: PromptCardData;
  priority?: boolean;
}) {
  const t = useTranslations('prompts');

  return (
    <Link href={`/prompts/${prompt.slug}`} className="block">
      <div className="group relative bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 active:scale-95 cursor-pointer shadow-xl shadow-primary/5">
      {/* 썸네일 */}
      <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden rounded-t-[32px]">
        {prompt.thumbnail ? (
          <img
            src={prompt.thumbnail}
            alt={prompt.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-primary/30" />
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-6 md:p-8 space-y-3">
        {/* 제목 */}
        <h3 className="text-lg font-semibold text-white line-clamp-2">
          {prompt.title}
        </h3>

        {/* 설명 */}
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
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
            <span className="text-xs text-gray-500">{prompt.aiModel}</span>
            
            {/* 평점 */}
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-400">{prompt.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* 가격 */}
          <span className="text-lg font-bold text-primary">
            ${prompt.price.toFixed(2)}
          </span>
        </div>
      </div>
      </div>
    </Link>
  );
}


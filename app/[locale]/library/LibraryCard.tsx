'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Star, Calendar } from 'lucide-react';
import ReviewModal from '@/components/ReviewModal';

/**
 * 구매한 프롬프트 정보 타입
 */
interface PurchasedPrompt {
  orderId: string;
  promptId: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  tags: string[];
  price: number;
  purchasedAt: string;
  existingReview: {
    id: string;
    rating: number;
    comment?: string;
  } | null;
}

/**
 * 라이브러리 카드 컴포넌트
 */
export default function LibraryCard({
  prompt,
  locale,
}: {
  prompt: PurchasedPrompt;
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations('library');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleReviewSuccess = () => {
    setIsReviewModalOpen(false);
    router.refresh(); // 페이지 새로고침하여 리뷰 상태 업데이트
  };

  const purchasedDate = new Date(prompt.purchasedAt).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  return (
    <>
      <div className="group relative bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-primary transition-all duration-300">
        {/* 썸네일 */}
        <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
          {prompt.thumbnail ? (
            <img
              src={prompt.thumbnail}
              alt={prompt.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-16 h-16 text-primary/30" />
            </div>
          )}
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-3">
          {/* 제목 */}
          <h3 className="text-lg font-semibold text-white line-clamp-1">
            {prompt.title}
          </h3>

          {/* 설명 */}
          <p className="text-sm text-gray-400 line-clamp-2">
            {prompt.description}
          </p>

          {/* 태그 */}
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prompt.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 구매일 */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{t('purchasedAt')}: {purchasedDate}</span>
          </div>

          {/* 기존 리뷰 표시 */}
          {prompt.existingReview && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= prompt.existingReview!.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-700 text-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-400">
                {prompt.existingReview.rating}점
              </span>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <Link
              href={`/${locale}/prompts/${prompt.slug}`}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-sm transition-colors"
            >
              {t('viewOriginal')}
            </Link>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-600 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              {prompt.existingReview ? t('editReview') : t('writeReview')}
            </button>
          </div>
        </div>
      </div>

      {/* 리뷰 모달 */}
      <ReviewModal
        orderId={prompt.orderId}
        promptId={prompt.promptId}
        existingReview={prompt.existingReview}
        isOpen={isReviewModalOpen}
        onClose={handleReviewSuccess}
      />
    </>
  );
}



'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: {
    name: string | null;
  };
}

interface ReviewsSectionProps {
  promptId: string;
}

/**
 * 리뷰 섹션 컴포넌트
 * 프롬프트에 대한 고객 리뷰를 표시
 */
export default function ReviewsSection({ promptId }: ReviewsSectionProps) {
  const t = useTranslations('prompts');
  const tReview = useTranslations('review');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const supabase = createClient();
        
        // 리뷰 조회
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(
            `
            id,
            rating,
            comment,
            created_at,
            user:profiles!reviews_user_id_fkey(name)
            `
          )
          .eq('prompt_id', promptId)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('리뷰 조회 오류:', reviewsError);
          return;
        }

        // 평균 평점 계산
        if (reviewsData && reviewsData.length > 0) {
          const avg =
            reviewsData.reduce((sum, r) => sum + r.rating, 0) /
            reviewsData.length;
          setAverageRating(avg);
          setReviews(reviewsData as Review[]);
        }
      } catch (error) {
        console.error('리뷰 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [promptId]);

  if (isLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-6"
      >
        <div className="h-8 bg-gray-800 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </motion.section>
    );
  }

  if (reviews.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-6"
      >
        <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
          {t('reviews')} (0)
        </h2>
        <p className="text-gray-400 text-center py-8">
          아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨주세요!
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-white tracking-[-0.02em] mb-4">
          {t('reviews')} ({reviews.length})
        </h2>
        
        {/* 평균 평점 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-700 text-gray-700'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-lg font-semibold text-white">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-gray-400">({reviews.length} {t('reviews')})</span>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 p-4 rounded-lg border border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-700 text-gray-700'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">
                {review.user?.name || '익명'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {review.comment && (
              <p className="text-gray-300 text-sm leading-relaxed">
                {review.comment}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}




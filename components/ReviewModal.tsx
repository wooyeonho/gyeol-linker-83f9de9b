'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Star, Loader2 } from 'lucide-react';
import { upsertReview } from '@/app/actions/reviews';

/**
 * 리뷰 모달 컴포넌트
 * 독립적인 클라이언트 컴포넌트로 재사용 가능
 */
export default function ReviewModal({
  orderId,
  promptId,
  existingReview,
  isOpen,
  onClose,
}: {
  orderId: string;
  promptId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('review');
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  // 기존 리뷰가 있으면 초기값 설정
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
    } else {
      setRating(0);
      setComment('');
    }
  }, [existingReview, isOpen]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setRating(existingReview?.rating || 0);
      setComment(existingReview?.comment || '');
      setSubmitting(false);
    }
  }, [isOpen, existingReview]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert(t('ratingRequired'));
      return;
    }

    setSubmitting(true);

    try {
      const result = await upsertReview(orderId, rating, comment || undefined);

      if (result.error) {
        alert(result.error);
        setSubmitting(false);
        return;
      }

      alert(t('success'));
      onClose();
      // 페이지 새로고침은 부모 컴포넌트에서 처리
    } catch (error) {
      console.error('리뷰 저장 오류:', error);
      alert(t('failed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {existingReview ? t('editTitle') : t('title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 별점 입력 */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-300">
              {t('rating')} <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={submitting}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-primary text-primary'
                        : 'fill-gray-700 text-gray-700'
                    } transition-colors`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-primary font-medium">
                  {rating}점
                </span>
              )}
            </div>
          </div>

          {/* 리뷰 내용 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              {t('comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder={t('commentPlaceholder')}
              disabled={submitting}
            />
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="px-6 py-2 bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <span>{t('submit')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



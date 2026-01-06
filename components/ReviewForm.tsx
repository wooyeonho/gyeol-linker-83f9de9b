'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface ReviewFormProps {
  promptId: string;
  userId: string;
  onSuccess?: () => void;
}

/**
 * Review Form Component
 * Seductive star rating with Jade Green styling
 * Only for verified buyers (purchase check done in parent)
 * Stitch Design System compliant
 */
export default function ReviewForm({ promptId, userId, onSuccess }: ReviewFormProps) {
  const t = useTranslations('reviews');
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      addToast({ type: 'warning', message: t('selectRating') });
      return;
    }
    
    if (comment.trim().length < 10) {
      addToast({ type: 'warning', message: t('commentTooShort') });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          prompt_id: promptId,
          user_id: userId,
          rating,
          comment: comment.trim(),
          verified_purchase: true,
        });

      if (error) {
        if (error.code === '23505') {
          addToast({ type: 'error', message: t('alreadyReviewed') });
        } else {
          addToast({ type: 'error', message: t('submitFailed') });
        }
        return;
      }

      addToast({ type: 'success', message: t('submitSuccess') });
      setRating(0);
      setComment('');
      onSuccess?.();
    } catch (error) {
      console.error('Review submission error:', error);
      addToast({ type: 'error', message: t('submitFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-8">
      <h3 className="text-xl font-semibold mb-6">{t('writeReview')}</h3>
      
      {/* Star Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-3">
          {t('yourRating')}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`size-10 transition-all ${
                  star <= (hover || rating)
                    ? 'fill-[#00A86B] text-[#00A86B]'
                    : 'text-gray-600 hover:text-gray-500'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-[#00A86B] mt-2">
            {rating === 5 && t('ratingExcellent')}
            {rating === 4 && t('ratingGood')}
            {rating === 3 && t('ratingAverage')}
            {rating === 2 && t('ratingPoor')}
            {rating === 1 && t('ratingTerrible')}
          </p>
        )}
      </div>

      {/* Comment Textarea */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-3">
          {t('yourReview')}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('reviewPlaceholder')}
          rows={4}
          maxLength={1000}
          className="w-full bg-black border border-gray-800 rounded-[24px] p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent resize-none transition-all"
        />
        <p className="text-xs text-gray-500 mt-2 text-right">
          {comment.length}/1000
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full bg-[#00A86B] hover:brightness-110 hover:scale-[1.02] text-white font-semibold py-4 rounded-[32px] transition-all shadow-lg shadow-[#00A86B]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            {t('submitting')}
          </>
        ) : (
          t('submitReview')
        )}
      </button>
    </form>
  );
}

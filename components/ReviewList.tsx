import { Star, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

interface Review {
  id: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
  user: {
    name: string | null;
  } | null;
}

interface ReviewListProps {
  promptId: string;
  locale: string;
}

/**
 * Review List Component
 * Premium review display with verified badge
 * Stitch Design System compliant
 */
export default async function ReviewList({ promptId, locale }: ReviewListProps) {
  const t = await getTranslations('reviews');
  const supabase = await createClient();

  // Fetch reviews with user info
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      verified_purchase,
      created_at,
      user:profiles(name)
    `)
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: false });

  // Calculate average rating
  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const reviewCount = reviews?.length || 0;

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews?.filter((r) => r.rating === star).length || 0,
    percentage: reviews?.length
      ? ((reviews.filter((r) => r.rating === star).length / reviews.length) * 100).toFixed(0)
      : '0',
  }));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return locale === 'ko'
      ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="text-6xl font-bold text-[#00A86B] mb-2">
              {avgRating}
            </div>
            <div className="flex justify-center md:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-5 ${
                    star <= Math.round(parseFloat(avgRating))
                      ? 'fill-[#00A86B] text-[#00A86B]'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {reviewCount} {t('verifiedReviews')}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-8">{star} {t('star')}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00A86B] transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      {reviewCount > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">{t('allReviews')}</h3>
          {reviews?.map((review: Review) => (
            <div
              key={review.id}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-6 hover:border-gray-700 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-white mb-1">
                    {review.user?.name || t('anonymousUser')}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`size-4 ${
                            s <= review.rating
                              ? 'fill-[#00A86B] text-[#00A86B]'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    {review.verified_purchase && (
                      <span className="flex items-center gap-1 text-xs text-[#00A86B] bg-[#00A86B]/10 px-2 py-0.5 rounded-full">
                        <Check className="size-3" />
                        {t('verifiedBuyer')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(review.created_at)}
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-12 text-center">
          <div className="text-4xl mb-4 opacity-30">⭐</div>
          <p className="text-gray-500">{t('noReviewsYet')}</p>
          <p className="text-sm text-gray-600 mt-2">{t('beFirstToReview')}</p>
        </div>
      )}
    </div>
  );
}

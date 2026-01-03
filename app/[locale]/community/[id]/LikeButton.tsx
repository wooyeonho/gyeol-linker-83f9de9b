'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { toggleLike } from '@/app/actions/community';
import { useRouter } from 'next/navigation';

/**
 * 좋아요 버튼 컴포넌트
 */
export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked?: boolean;
  initialCount: number;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked || false);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleLike(postId);
      if (result.success) {
        setLiked(result.liked || false);
        setCount((prev) => (result.liked ? prev + 1 : prev - 1));
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        liked
          ? 'bg-primary text-white hover:bg-primary-600'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
      <span>{count.toLocaleString()}</span>
    </button>
  );
}



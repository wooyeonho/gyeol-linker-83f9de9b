'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createComment } from '@/app/actions/community';

/**
 * 댓글 작성 폼 컴포넌트
 */
export default function CommentForm({
  postId,
  onSuccess,
}: {
  postId: string;
  onSuccess?: () => void;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await createComment(postId, content);
      if (result.success) {
        setContent('');
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-2">
          {t('writeComment')}
        </label>
        <textarea
          id="comment"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('commentPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none leading-relaxed"
          disabled={isPending}
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="px-6 py-2 bg-primary text-white rounded-[32px] font-medium hover:bg-primary-600 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? t('commentSubmitting') : t('commentSubmit')}
      </button>
    </form>
  );
}


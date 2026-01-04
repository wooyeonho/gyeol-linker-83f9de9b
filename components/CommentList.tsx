'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Trash2, User } from 'lucide-react';
import { CommunityComment } from '@/app/actions/community';
import { deleteComment } from '@/app/actions/community';

/**
 * 댓글 리스트 컴포넌트
 */
export default function CommentList({
  comments,
  currentUserId,
  onDelete,
}: {
  comments: CommunityComment[];
  currentUserId: string | null;
  onDelete?: () => void;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm(t('commentDeleteConfirm'))) {
      return;
    }

    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.success) {
        if (onDelete) {
          onDelete();
        } else {
          router.refresh();
        }
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>{t('noComments')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">
                {comment.author_name || '익명'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            {currentUserId === comment.author_id && (
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={isPending}
                className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label={t('commentDelete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}


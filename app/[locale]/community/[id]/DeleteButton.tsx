'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Trash2 } from 'lucide-react';
import { deletePost } from '@/app/actions/community';

/**
 * 게시글 삭제 버튼 컴포넌트
 */
export default function DeleteButton({ postId }: { postId: string }) {
  const t = useTranslations('community');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.success) {
        router.push(`/${locale}/community`);
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-[32px] hover:bg-red-700 transition-all disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      {t('delete')}
    </button>
  );
}



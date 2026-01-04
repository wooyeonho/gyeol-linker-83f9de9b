'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createPost } from '@/app/actions/community';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PromptSearch from './PromptSearch';

/**
 * 커뮤니티 글쓰기 페이지
 */
export default function CommunityNewPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('community');
  const [category, setCategory] = useState<'tips' | 'qna' | 'free'>('tips');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    startTransition(async () => {
      const result = await createPost({
        category,
        title,
        content,
        promptId,
      });

      if (result.success && result.postId) {
        router.push(`/${locale}/community/${result.postId}`);
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 뒤로가기 */}
        <Link
          href={`/${locale}/community`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('title')}로 돌아가기
        </Link>

        {/* 제목 */}
        <h1 className="text-3xl font-bold text-white mb-8">{t('write')}</h1>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 카테고리 선택 */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
              {t('selectCategory')}
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'tips' | 'qna' | 'free')}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="tips">{t('tips')}</option>
              <option value="qna">{t('qna')}</option>
              <option value="free">{t('free')}</option>
            </select>
          </div>

          {/* 제목 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              {t('postTitle')}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* 내용 */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
              {t('postContent')}
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={15}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              required
            />
          </div>

          {/* 프롬프트 태깅 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('selectPrompt')}
            </label>
            <PromptSearch
              selectedPromptId={promptId}
              onSelect={(id) => setPromptId(id)}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/${locale}/community`}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}


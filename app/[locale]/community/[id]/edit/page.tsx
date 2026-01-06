'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getPost, updatePost } from '@/app/actions/community';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PromptSearch from '../../new/PromptSearch';

/**
 * 커뮤니티 게시글 수정 페이지
 */
export default function CommunityEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = params;
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('community');
  const [post, setPost] = useState<any>(null);
  const [category, setCategory] = useState<'tips' | 'qna' | 'free'>('tips');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadPost = async () => {
      const { id } = await resolvedParams;
      const postData = await getPost(id);
      if (postData) {
        setPost(postData);
        setCategory(postData.category as 'tips' | 'qna' | 'free');
        setTitle(postData.title);
        setContent(postData.content);
        setPromptId(postData.prompt_id);
      }
      setIsLoading(false);
    };
    loadPost();
  }, [resolvedParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    startTransition(async () => {
      const { id } = await resolvedParams;
      const result = await updatePost(id, {
        category,
        title,
        content,
        promptId,
      });

      if (result.success) {
        router.push(`/${locale}/community/${id}`);
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="container mx-auto px-4 py-24">
          <div className="text-center py-12">
            <p className="text-gray-400">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="container mx-auto px-4 py-24">
          <div className="text-center py-12">
            <p className="text-gray-400">게시글을 찾을 수 없습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      <main className="container mx-auto px-4 py-24 max-w-4xl">
        {/* 뒤로가기 */}
        <Link
          href={`/community/${post.id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          게시글로 돌아가기
        </Link>

        {/* 제목 */}
        <h1 className="text-3xl font-bold text-white mb-8">{t('edit')}</h1>

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
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-[32px] text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-[24px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
              href={`/community/${post.id}`}
              className="px-6 py-2 bg-gray-800 text-white rounded-[32px] font-medium hover:bg-gray-700 transition-all"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-primary text-white rounded-[32px] font-medium hover:bg-primary-600 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? t('updating') : t('update')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}


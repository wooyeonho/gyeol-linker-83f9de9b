import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import CommentList from '@/components/CommentList';
import CommentForm from '@/components/CommentForm';
import PromptCard, { PromptCardData } from '@/components/PromptCard';
import MarkdownRenderer from '@/components/community/MarkdownRenderer';
import { getPost, getComments, incrementViewCount, toggleLike, deletePost } from '@/app/actions/community';
import { createClient } from '@/lib/supabase/server';
import { Eye, Heart, MessageCircle, User, Edit, Trash2, ArrowLeft } from 'lucide-react';
import LikeButton from './LikeButton';
import DeleteButton from './DeleteButton';

/**
 * 조회수 증가 컴포넌트
 */
async function ViewCountIncrement({ postId }: { postId: string }) {
  await incrementViewCount(postId);
  return null;
}

/**
 * 커뮤니티 게시글 상세 페이지
 */
export default async function CommunityPostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('community');
  const supabase = await createClient();

  // 게시글 조회
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 댓글 조회
  const comments = await getComments(id);

  // 태깅된 프롬프트 조회
  let taggedPrompt: PromptCardData | null = null;
  if (post.prompt_id) {
    const { data: prompt } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', post.prompt_id)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .single();

    if (prompt) {
      const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
      const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;

      taggedPrompt = {
        id: prompt.id,
        slug: prompt.slug,
        title,
        description,
        thumbnail: prompt.thumbnail_url || '',
        tags: prompt.tags || [],
        aiModel: prompt.ai_model,
        rating: prompt.average_rating || 0,
        price: parseFloat(prompt.price),
        viewCount: prompt.view_count,
        purchaseCount: prompt.purchase_count,
        createdAt: prompt.created_at,
      };
    }
  }

  // 카테고리 라벨
  const categoryLabels: Record<string, string> = {
    tips: t('tips'),
    qna: t('qna'),
    free: t('free'),
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAuthor = user?.id === post.author_id;

  return (
    <main className="container mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('title')}로 돌아가기
        </Link>

        {/* 게시글 */}
        <article className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {/* 카테고리 */}
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full mb-3">
                {categoryLabels[post.category] || post.category}
              </span>
              {/* 제목 */}
              <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>
              {/* 메타 정보 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{post.author_name || '익명'}</span>
                </div>
                <span>{formatDate(post.created_at)}</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.view_count.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 좋아요 버튼 */}
            <div className="flex items-center gap-4">
              <Suspense fallback={<div className="w-20 h-10 bg-gray-800 rounded animate-pulse" />}>
                <LikeButton postId={post.id} initialLiked={post.is_liked} initialCount={post.like_count} />
              </Suspense>
            </div>
          </div>

          {/* 본문 */}
          <div className="prose prose-invert max-w-none mb-8">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* 하단 액션 */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-800">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.like_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comment_count.toLocaleString()}</span>
              </div>
            </div>

            {isAuthor && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/community/${post.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  {t('edit')}
                </Link>
                <Suspense fallback={null}>
                  <DeleteButton postId={post.id} />
                </Suspense>
              </div>
            )}
          </div>
        </article>

        {/* 태깅된 프롬프트 */}
        {taggedPrompt && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t('taggedPrompt')}</h2>
            <div className="max-w-md">
              <PromptCard prompt={taggedPrompt} />
            </div>
          </div>
        )}

        {/* 댓글 섹션 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">
            {t('comments')} ({comments.length})
          </h2>

          {/* 댓글 작성 폼 */}
          {user ? (
            <div className="mb-8">
              <CommentForm postId={post.id} />
            </div>
          ) : (
            <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center text-gray-400">
              <p>{t('loginRequired')}</p>
            </div>
          )}

          {/* 댓글 리스트 */}
          <Suspense
            fallback={
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                    <div className="h-4 bg-gray-700 rounded w-full" />
                  </div>
                ))}
              </div>
            }
          >
            <CommentList comments={comments} currentUserId={user?.id || null} />
          </Suspense>
        </div>

        {/* 조회수 증가 (백그라운드) */}
        <Suspense fallback={null}>
          <ViewCountIncrement postId={id} />
        </Suspense>
      </main>
  );
}


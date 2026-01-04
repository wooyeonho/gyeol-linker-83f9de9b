import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Eye, Heart, MessageCircle, User } from 'lucide-react';
import { CommunityPost } from '@/app/actions/community';
import { motion } from 'framer-motion';

/**
 * 커뮤니티 게시글 카드 컴포넌트
 */
export default function CommunityPostCard({ post }: { post: CommunityPost }) {
  const t = useTranslations('community');
  const locale = useLocale();

  // 카테고리 라벨
  const categoryLabels: Record<string, string> = {
    tips: t('tips'),
    qna: t('qna'),
    free: t('free'),
  };

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
    });
  };

  // 내용 미리보기 (200자 제한)
  const preview = post.content.length > 200
    ? post.content.substring(0, 200) + '...'
    : post.content;

  return (
    <Link href={`/${locale}/community/${post.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 hover:border-primary transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer shadow-xl shadow-primary/5"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* 카테고리 */}
            <span className="px-3 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full">
              {categoryLabels[post.category] || post.category}
            </span>
            {/* 작성자 */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="w-4 h-4" />
              <span>{post.author_name || '익명'}</span>
            </div>
          </div>
          {/* 작성일 */}
          <span className="text-xs text-gray-500">{formatDate(post.created_at)}</span>
        </div>

        {/* 제목 */}
        <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
          {post.title}
        </h3>

        {/* 내용 미리보기 */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {preview}
        </p>

        {/* 하단 정보 */}
        <div className="flex items-center gap-6 text-sm text-gray-500">
          {/* 조회수 */}
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{post.view_count.toLocaleString()}</span>
          </div>
          {/* 좋아요 */}
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{post.like_count.toLocaleString()}</span>
          </div>
          {/* 댓글 */}
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comment_count.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}


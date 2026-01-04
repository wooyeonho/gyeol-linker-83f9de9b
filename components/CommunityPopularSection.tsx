import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getPopularPosts } from '@/app/actions/community';
import CommunityPostCard from '@/components/CommunityPostCard';
import { MessageCircle, Sparkles } from 'lucide-react';

/**
 * 커뮤니티 인기글 섹션 컴포넌트
 */
export default async function CommunityPopularSection() {
  const tCommunity = await getTranslations('community');
  const tHome = await getTranslations('home');
  const locale = await getLocale();
  const posts = await getPopularPosts(4);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-24 md:py-32 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* 섹션 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {tCommunity('popularPosts')}
            </h2>
          </div>
          <Link
            href={`/${locale}/community`}
            className="text-primary hover:text-primary-600 transition-colors font-medium"
          >
            {tHome('viewMore')} →
          </Link>
        </div>

        {/* 게시글 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <CommunityPostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}


import { getTranslations, getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/routing';
import CommunityPostCard from '@/components/CommunityPostCard';
import { getPosts, getPopularPosts, CommunityPost } from '@/app/actions/community';
import { CommunityCategory } from '@/app/actions/community';
import { Search, Plus, Sparkles } from 'lucide-react';

/**
 * 커뮤니티 목록 컴포넌트
 */
async function CommunityList({
  category,
  search,
  sort,
  page,
}: {
  category: CommunityCategory;
  search: string;
  sort: string;
  page: number;
}) {
  const posts = await getPosts({ category, search, sort: sort as any, page, limit: 20 });

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">게시글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <CommunityPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

/**
 * 인기글 섹션
 */
async function PopularPostsSection() {
  const posts = await getPopularPosts(5);
  const locale = await getLocale();

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        인기글
      </h3>
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${locale}/community/${post.id}`}
            className="block p-3 bg-gray-800 rounded-[24px] hover:bg-gray-700 transition-all"
          >
            <h4 className="text-sm font-medium text-white line-clamp-1 mb-1">
              {post.title}
            </h4>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>좋아요 {post.like_count}</span>
              <span>조회 {post.view_count}</span>
              <span>댓글 {post.comment_count}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * 커뮤니티 목록 페이지
 */
export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const { category = 'all', search = '', sort = 'latest', page = '1' } = await searchParams;
  const t = await getTranslations('community');

  const categoryValue = (['all', 'tips', 'qna', 'free'].includes(category)
    ? category
    : 'all') as CommunityCategory;
  const sortValue = ['latest', 'popular', 'views'].includes(sort) ? sort : 'latest';
  const pageValue = parseInt(page) || 1;

  return (
    <main className="container mx-auto px-4 py-24">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">{t('title')}</h1>
          <Link
            href={`/${locale}/community/new`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[32px] font-medium hover:bg-primary-600 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            {t('write')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 필터 및 검색 */}
            <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 space-y-4">
              {/* 카테고리 필터 */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'tips', 'qna', 'free'] as const).map((cat) => (
                  <Link
                    key={cat}
                    href={`/${locale}/community?category=${cat}&search=${search}&sort=${sort}`}
                                        className={`px-4 py-2 rounded-[32px] font-medium transition-all ${
                                          categoryValue === cat
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                  >
                    {t(cat)}
                  </Link>
                ))}
              </div>

              {/* 검색 및 정렬 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <form
                  method="get"
                  action={`/${locale}/community`}
                  className="flex-1 flex items-center gap-2"
                >
                  <input type="hidden" name="category" value={categoryValue} />
                  <input type="hidden" name="sort" value={sortValue} />
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="search"
                      defaultValue={search}
                      placeholder={t('searchPlaceholder')}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-[32px] font-medium hover:bg-primary-600 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                  >
                    {t('search')}
                  </button>
                </form>

                {/* 정렬 */}
                <div className="flex gap-2">
                  {(['latest', 'popular', 'views'] as const).map((s) => (
                    <Link
                      key={s}
                      href={`/${locale}/community?category=${categoryValue}&search=${search}&sort=${s}`}
                                            className={`px-4 py-2 rounded-[32px] font-medium transition-all ${
                                              sortValue === s
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                            }`}
                    >
                      {t(`sort${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 게시글 목록 */}
            <Suspense
              fallback={
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 animate-pulse"
                    >
                      <div className="h-6 bg-gray-800 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-gray-800 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-800 rounded w-5/6" />
                    </div>
                  ))}
                </div>
              }
            >
              <CommunityList
                category={categoryValue}
                search={search}
                sort={sortValue}
                page={pageValue}
              />
            </Suspense>

            {/* 더보기 버튼 */}
            <div className="text-center">
              <Link
                href={`/${locale}/community?category=${categoryValue}&search=${search}&sort=${sortValue}&page=${pageValue + 1}`}
                className="inline-block px-6 py-3 bg-gray-900 border border-gray-800 text-white rounded-[32px] font-medium hover:border-primary transition-all"
              >
                {t('loadMore')}
              </Link>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="h-64 bg-gray-900 rounded-[32px] animate-pulse" />}>
              <PopularPostsSection />
            </Suspense>
          </div>
        </div>
      </main>
  );
}


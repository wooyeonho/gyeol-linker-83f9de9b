import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Home, Search } from 'lucide-react';

/**
 * 404 페이지
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* 404 숫자 */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-primary/20">404</h1>
          </div>

          {/* 메시지 */}
          <h2 className="text-4xl font-bold mb-4 text-white">
            {t('title')}
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            {t('message')}
          </p>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 rounded-lg transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              {t('goHome')}
            </Link>
            <Link
              href="/prompts"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors font-medium"
            >
              <Search className="w-5 h-5" />
              {t('browsePrompts')}
            </Link>
          </div>
        </div>
      </main>
  );
}


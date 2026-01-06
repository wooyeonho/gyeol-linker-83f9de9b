import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Home, Search } from 'lucide-react';

/**
 * 404 페이지
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');
  const locale = await getLocale();

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
              href={`/${locale}`}
              aria-label={t('goHome')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 hover:brightness-110 rounded-[32px] transition-all font-medium shadow-lg shadow-primary/20"
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              {t('goHome')}
            </Link>
            <Link
              href={`/${locale}/prompts`}
              aria-label={t('browsePrompts')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-[32px] transition-all font-medium"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
              {t('browsePrompts')}
            </Link>
          </div>
        </div>
      </main>
  );
}


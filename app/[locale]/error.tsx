'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

/**
 * 전역 에러 페이지
 * Next.js Error Boundary용
 * Note: Header는 Server Component이므로 제외 (에러 페이지는 독립적으로 동작)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    // 에러 로깅 (선택사항)
    console.error('에러 발생:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white">
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* 에러 아이콘 */}
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </div>

          {/* 에러 메시지 */}
          <h1 className="text-4xl font-bold mb-4 text-white">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            {t('message')}
          </p>

          {/* 에러 상세 정보 (개발 환경에서만) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-lg text-left">
              <p className="text-sm text-red-400 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              {t('retry')}
            </button>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              {t('goHome')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}


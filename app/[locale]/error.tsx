'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const locale = useLocale();

  useEffect(() => {
    // 에러 로깅 (선택사항)
    console.error('에러 발생:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* 에러 아이콘 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8 flex justify-center"
          >
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </motion.div>

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              onClick={reset}
              aria-label={t('retry')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              {t('retry')}
            </motion.button>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href={`/${locale}`}
                aria-label={t('goHome')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors font-medium"
              >
                <Home className="w-5 h-5" aria-hidden="true" />
                {t('goHome')}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}


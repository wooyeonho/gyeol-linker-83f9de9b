'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useToast } from './ui/Toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 에러 바운더리 컴포넌트
 * React 컴포넌트 트리에서 발생한 에러를 포착하고 UI로 표시
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 (실제 환경에서는 Sentry 등으로 전송)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 커스텀 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * 에러 폴백 UI
 */
function ErrorFallback({ error }: { error: Error | null }) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push(`/${locale}`);
    addToast({ type: 'info', message: '홈으로 이동했습니다.' });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center"
      >
        {/* 에러 아이콘 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8 flex justify-center"
        >
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-400" aria-hidden="true" />
          </div>
        </motion.div>

        {/* 에러 메시지 */}
        <h1 className="text-4xl font-bold mb-4 text-white">문제가 발생했습니다</h1>
        <p className="text-xl text-gray-400 mb-8">
          예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 돌아가주세요.
        </p>

        {/* 개발 환경에서만 에러 상세 정보 표시 */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-lg text-left">
            <p className="text-sm text-red-400 font-mono break-all mb-2">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs text-gray-500 overflow-auto max-h-48">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={handleRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 rounded-lg transition-colors font-medium"
            aria-label="페이지 새로고침"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            새로고침
          </motion.button>
          <motion.button
            onClick={handleGoHome}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors font-medium"
            aria-label="홈으로 이동"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            홈으로
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}


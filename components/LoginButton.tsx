'use client';

import { useCallback, memo } from 'react';
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signInWithGoogle } from '@/app/actions/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * 로그인 버튼 컴포넌트
 * 비로그인 상태일 때 표시
 * React.memo와 useCallback으로 최적화
 */
const LoginButton = memo(function LoginButton() {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      // 현재 도메인을 동적으로 참조
      const currentUrl = window.location.origin;
      const { url, error } = await signInWithGoogle(currentUrl);
      if (error) {
        console.error('로그인 오류:', error);
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
      } else if (url) {
        // Google OAuth 페이지로 리다이렉트
        window.location.href = url;
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  return (
    <motion.button
      onClick={handleSignIn}
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-[32px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <motion.div
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
      >
        <LogIn className="w-4 h-4" />
      </motion.div>
      <span className="hidden sm:inline">
        {isLoading ? '로그인 중...' : t('loginWithGoogle')}
      </span>
    </motion.button>
  );
});

export default LoginButton;


'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signInWithGoogle } from '@/app/actions/auth';
import { useState } from 'react';

/**
 * 로그인 버튼 컴포넌트
 * 비로그인 상태일 때 표시
 */
export default function LoginButton() {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { url, error } = await signInWithGoogle();
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
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-[32px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <LogIn className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isLoading ? '로그인 중...' : t('loginWithGoogle')}
      </span>
    </button>
  );
}


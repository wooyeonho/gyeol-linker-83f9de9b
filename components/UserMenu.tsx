'use client';

import { LogOut, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { signOut } from '@/app/actions/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * 사용자 메뉴 컴포넌트
 * 로그인 상태일 때 표시
 */
export default function UserMenu({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string;
}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.refresh(); // 서버 상태 갱신
      router.push(`/${locale}`); // 현재 locale의 홈으로 리다이렉트
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3"
    >
      {/* 사용자 정보 */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-lg border border-gray-800"
      >
        <User className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-white hidden sm:inline">
          {userName || userEmail}
        </span>
      </motion.div>

      {/* 로그아웃 버튼 */}
      <motion.button
        onClick={handleSignOut}
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg border border-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">{t('logout')}</span>
      </motion.button>
    </motion.div>
  );
}



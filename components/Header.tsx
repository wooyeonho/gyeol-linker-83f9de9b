import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import UserMenu from './UserMenu';
import LoginButton from './LoginButton';
import NotificationBell from './NotificationBell';

/**
 * 헤더 컴포넌트
 * 서버 컴포넌트로 인증 상태 확인
 */
export default async function Header() {
  const t = await getTranslations('common');
  const supabase = await createClient();

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 프로필 정보 조회
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">{t('appName')}</h1>
          </Link>

          {/* 검색창 */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 인증 상태에 따른 버튼 */}
          <div className="flex items-center gap-4">
            {user && profile && <NotificationBell />}
            {user && profile ? (
              <UserMenu
                userName={profile.name}
                userEmail={profile.email || user.email || ''}
              />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

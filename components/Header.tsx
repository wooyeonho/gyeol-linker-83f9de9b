import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import UserMenu from './UserMenu';
import LoginButton from './LoginButton';
import NotificationBell from './NotificationBell';
import SearchBar from './SearchBar';

/**
 * 헤더 컴포넌트
 * 서버 컴포넌트로 인증 상태 확인
 */
export default async function Header() {
  const t = await getTranslations('common');
  const locale = await getLocale();
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
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50" role="banner">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <nav className="flex items-center justify-between gap-4" aria-label="메인 네비게이션">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2" aria-label="홈으로 이동">
            <h1 className="text-2xl font-bold text-primary">{t('appName')}</h1>
          </Link>

          {/* 검색창 */}
          <SearchBar />

          {/* 인증 상태에 따른 버튼 */}
          <div className="flex items-center gap-4" role="group" aria-label="사용자 메뉴">
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
        </nav>
      </div>
    </header>
  );
}

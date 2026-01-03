import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PromptForm from './PromptForm';

/**
 * 프롬프트 등록 페이지 (서버 컴포넌트)
 * 권한 확인 후 클라이언트 컴포넌트 렌더링
 */
export default async function NewPromptPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  // 2. 프로필 및 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('accessDenied')}</h1>
            <p className="text-gray-400">
              판매자 권한이 필요합니다. 관리자에게 문의하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <PromptForm />;
}

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';

/**
 * 다국어 레이아웃
 * next-intl로 메시지 제공
 * Header를 모든 페이지에 일관되게 제공
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 지원하지 않는 언어면 404
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // 메시지 로드
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-black text-white">
        <Header />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}


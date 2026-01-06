import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import ProgressBar from '@/components/ui/ProgressBar';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // 메시지 로드
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ErrorBoundary>
        <ToastProvider>
          <ProgressBar />
          <KeyboardShortcuts />
                    <div className="min-h-screen bg-black text-white flex flex-col">
                      <Header />
                      <main className="flex-1">
                        {children}
                      </main>
                      <Footer />
                    </div>
        </ToastProvider>
      </ErrorBoundary>
    </NextIntlClientProvider>
  );
}


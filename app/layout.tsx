import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Variable font 사용으로 성능 최적화
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: '프롬프트 정음',
    template: '%s | 프롬프트 정음',
  },
  description: 'AI 프롬프트 전문가들의 마켓플레이스. 올바른 언어로 소통하는 프리미엄 큐레이션',
  keywords: ['AI 프롬프트', '프롬프트 마켓플레이스', 'ChatGPT', 'Claude', 'Midjourney', 'AI 도구'],
  authors: [{ name: '프롬프트 정음' }],
  creator: '프롬프트 정음',
  publisher: '프롬프트 정음',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-jeongeum.com'),
  alternates: {
    canonical: '/',
    languages: {
      'ko': '/ko',
      'en': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: '프롬프트 정음',
    title: '프롬프트 정음',
    description: 'AI 프롬프트 전문가들의 마켓플레이스',
  },
  twitter: {
    card: 'summary_large_image',
    title: '프롬프트 정음',
    description: 'AI 프롬프트 전문가들의 마켓플레이스',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.variable} ${inter.className}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}



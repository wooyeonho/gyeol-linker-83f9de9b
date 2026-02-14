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
    default: 'GYEOL',
    template: '%s | GYEOL',
  },
  description: 'AI 디지털 동반자 — 대화할수록 성장하고 진화하는 나만의 AI',
  keywords: ['AI 동반자', 'AI companion', 'GYEOL', 'digital companion', '인공지능'],
  authors: [{ name: 'GYEOL' }],
  creator: 'GYEOL',
  publisher: 'GYEOL',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gyeol.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: 'GYEOL',
    title: 'GYEOL',
    description: 'AI 디지털 동반자 — 대화할수록 성장하고 진화하는 나만의 AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GYEOL',
    description: 'AI 디지털 동반자 — 대화할수록 성장하고 진화하는 나만의 AI',
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



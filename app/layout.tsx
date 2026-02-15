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
    default: 'GYEOL — AI Companion That Evolves With You',
    template: '%s | GYEOL',
  },
  description: 'Your personal AI companion that grows, evolves, and learns through every conversation. Watch it transform from a single point of light into a unique being.',
  keywords: ['AI companion', 'digital companion', 'GYEOL', 'evolving AI', 'personal AI', 'AI chat', 'AI 동반자'],
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
    locale: 'en_US',
    url: '/',
    siteName: 'GYEOL',
    title: 'GYEOL — AI Companion That Evolves With You',
    description: 'Your personal AI companion that grows, evolves, and learns through every conversation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GYEOL — AI Companion That Evolves With You',
    description: 'Your personal AI companion that grows, evolves, and learns through every conversation.',
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
    <html lang="en" className="dark" suppressHydrationWarning>
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



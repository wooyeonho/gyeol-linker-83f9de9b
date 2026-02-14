import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GYEOL (결) | 자율 진화 AI',
  description: '무(無)에서 함께 성장하는 AI 컴패니언.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body className="bg-black text-[#E5E5E5]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

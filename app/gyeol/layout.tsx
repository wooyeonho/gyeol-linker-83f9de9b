import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GYEOL (결) | 자율 진화 AI',
  description: '무(無)에서 함께 성장하는 AI 컴패니언. OpenClaw 기반.',
};

export default function GyeolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import HeroSectionAnimated from './HeroSectionAnimated';

/**
 * Hero Section 컴포넌트
 */
export default async function HeroSection() {
  const t = await getTranslations('home');

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
      
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <HeroSectionAnimated>
          <div className="max-w-4xl mx-auto text-center">
            {/* 메인 타이틀 */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {t('heroTitle')}
            </h1>

            {/* 서브 타이틀 */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              {t('heroSubtitle')}
            </p>

            {/* CTA 버튼 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/prompts"
                className="group flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-[32px] font-semibold text-lg hover:bg-primary-600 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
              >
                {t('browsePrompts')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/community"
                className="px-8 py-4 bg-gray-900 border border-gray-800 text-white rounded-[32px] font-semibold text-lg hover:bg-gray-800 transition-all duration-200 hover:border-primary active:scale-95"
              >
                {t('joinCommunity')}
              </Link>
            </div>
          </div>
        </HeroSectionAnimated>
      </div>
    </section>
  );
}


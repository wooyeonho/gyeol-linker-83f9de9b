'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Copy, Check, Twitter, Facebook } from 'lucide-react';

/**
 * 소셜 공유 버튼 컴포넌트
 */
export default function ShareButtons({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description?: string;
}) {
  const t = useTranslations('prompts');
  const [copied, setCopied] = useState(false);

  // 전체 URL 생성
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${url}`
    : url;

  // 링크 복사
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('링크 복사 실패:', error);
    }
  };

  // 트위터 공유
  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      fullUrl
    )}&text=${encodeURIComponent(title)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  // 페이스북 공유
  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      fullUrl
    )}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">{t('share')}</span>
      <div className="flex items-center gap-2">
        {/* 링크 복사 */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-800 rounded-[32px] transition-all duration-200 hover:border-primary active:scale-95 text-sm"
          title={t('copyLink')}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{t('linkCopied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-gray-300" />
              <span className="text-gray-300">{t('copyLink')}</span>
            </>
          )}
        </button>

        {/* 트위터 공유 */}
        <button
          onClick={handleShareTwitter}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-800 rounded-[32px] transition-all duration-200 hover:border-primary active:scale-95 text-sm"
          title={t('shareOnTwitter')}
        >
          <Twitter className="w-4 h-4 text-gray-300" />
          <span className="text-gray-300 hidden sm:inline">{t('shareOnTwitter')}</span>
        </button>

        {/* 페이스북 공유 */}
        <button
          onClick={handleShareFacebook}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-800 rounded-[32px] transition-all duration-200 hover:border-primary active:scale-95 text-sm"
          title={t('shareOnFacebook')}
        >
          <Facebook className="w-4 h-4 text-gray-300" />
          <span className="text-gray-300 hidden sm:inline">{t('shareOnFacebook')}</span>
        </button>
      </div>
    </div>
  );
}


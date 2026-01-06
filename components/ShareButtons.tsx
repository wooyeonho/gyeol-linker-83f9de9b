'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Twitter, Linkedin, Link as LinkIcon } from 'lucide-react';

/**
 * Premium Social Share Buttons Component
 * Stitch Design System - Jade Green hover effects, circular buttons
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

  // LinkedIn 공유
  const handleShareLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      fullUrl
    )}`;
    window.open(linkedInUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 font-medium">{t('share')}:</span>
      
      {/* Twitter/X */}
      <button
        onClick={handleShareTwitter}
        className="group size-10 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#00A86B] flex items-center justify-center transition-all hover:scale-110"
        aria-label={t('shareOnTwitter')}
        title={t('shareOnTwitter')}
      >
        <Twitter className="size-4 text-gray-400 group-hover:text-[#00A86B] transition-colors" />
      </button>
      
      {/* LinkedIn */}
      <button
        onClick={handleShareLinkedIn}
        className="group size-10 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#00A86B] flex items-center justify-center transition-all hover:scale-110"
        aria-label={t('shareOnLinkedIn')}
        title={t('shareOnLinkedIn')}
      >
        <Linkedin className="size-4 text-gray-400 group-hover:text-[#00A86B] transition-colors" />
      </button>
      
      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="group size-10 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#00A86B] flex items-center justify-center transition-all hover:scale-110"
        aria-label={t('copyLink')}
        title={t('copyLink')}
      >
        {copied ? (
          <Check className="size-4 text-[#00A86B]" />
        ) : (
          <LinkIcon className="size-4 text-gray-400 group-hover:text-[#00A86B] transition-colors" />
        )}
      </button>
      
      {/* Copied feedback */}
      {copied && (
        <span className="text-xs text-[#00A86B] font-medium animate-pulse">
          {t('linkCopied')}
        </span>
      )}
    </div>
  );
}


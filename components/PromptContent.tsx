'use client';

import { useState } from 'react';
import { Copy, Check, Lock, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils/currency';

/**
 * Premium Prompt Content Component
 * Seductive blur for non-owners, clean access for owners
 * Stitch Design System compliant
 */
export default function PromptContent({
  content,
  hasPurchased,
  price,
  salesCount,
  onPurchaseClick,
}: {
  content: string | null;
  hasPurchased: boolean;
  price?: number;
  salesCount?: number;
  onPurchaseClick?: () => void;
}) {
  const t = useTranslations('prompts');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Non-purchased state: SEDUCTIVE blur overlay
  if (!hasPurchased || !content) {
    return (
      <div className="relative">
        {/* Blurred content - teaser */}
        <div className="blur-xl select-none pointer-events-none opacity-60">
          <pre className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-6 text-gray-400 font-mono text-sm whitespace-pre-wrap">
            {content || `You are an expert AI assistant specialized in [DOMAIN]. Your task is to help users achieve [GOAL] by providing detailed, actionable guidance.

## Context
- Target audience: [AUDIENCE]
- Desired outcome: [OUTCOME]
- Constraints: [CONSTRAINTS]

## Instructions
1. Begin by understanding the user's specific needs
2. Provide step-by-step guidance
3. Include examples and best practices
4. Anticipate common questions and address them proactively

## Output Format
- Use clear, structured formatting
- Include relevant examples
- Provide actionable next steps

Remember to maintain a professional yet approachable tone throughout your responses...`}
          </pre>
        </div>

        {/* Seductive overlay with Jade Green glow */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/40 via-black/80 to-black/95 backdrop-blur-md rounded-[32px]">
          <div className="text-center p-8 max-w-md">
            {/* Glowing lock icon */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 blur-2xl bg-[#00A86B] opacity-50 animate-pulse" />
              <Lock className="relative size-20 text-[#00A86B]" strokeWidth={1.5} />
            </div>

            <h3 className="text-3xl font-bold mb-3 tracking-tight text-white">
              {t('premiumContentLocked')}
            </h3>

            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              {t('unlockDescription')}{' '}
              <span className="text-white font-semibold">
                {salesCount || 0}+ {t('professionals')}
              </span>
            </p>

            {/* Price with benefits */}
            {price !== undefined && (
              <div className="bg-[#0A0A0A] border border-[#00A86B]/30 rounded-[24px] p-6 mb-8">
                <div className="text-4xl font-bold text-[#00A86B] mb-2">
                  {formatPrice(price)}
                </div>
                <div className="text-sm text-gray-500">
                  {t('instantAccess')} • {t('lifetimeUpdates')}
                </div>
              </div>
            )}

            {/* CTA button with glow */}
            {onPurchaseClick && (
              <button
                onClick={onPurchaseClick}
                className="w-full bg-[#00A86B] hover:brightness-110 hover:scale-105 text-white font-semibold text-lg px-10 py-5 rounded-[32px] transition-all shadow-lg shadow-[#00A86B]/30"
              >
                {t('purchaseUnlockNow')} →
              </button>
            )}

            <p className="text-xs text-gray-600 mt-4">
              ✓ {t('securePayment')} • ✓ {t('instantDelivery')} • ✓ {t('support247')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Owned state: clean access with ownership badge
  return (
    <div className="space-y-6">
      {/* Ownership badge */}
      <div className="bg-[#00A86B]/10 border border-[#00A86B]/30 rounded-[24px] p-4 flex items-center gap-3">
        <CheckCircle className="size-5 text-[#00A86B]" />
        <div>
          <div className="font-semibold text-[#00A86B]">{t('youOwnThisPrompt')}</div>
        </div>
      </div>

      {/* Full content */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {t('originalPrompt')}
          </h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-[32px] transition-all"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                <span>{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span>{t('copyToClipboard')}</span>
              </>
            )}
          </button>
        </div>
        <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-gray-950 p-4 rounded-[16px] border border-gray-800 overflow-x-auto">
          {content}
        </pre>
      </div>
    </div>
  );
}



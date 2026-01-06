'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * 프롬프트 원문 컴포넌트
 * 구매 여부에 따라 조건부 렌더링
 */
export default function PromptContent({
  content,
  hasPurchased,
}: {
  content: string | null;
  hasPurchased: boolean;
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
      console.error('복사 실패:', error);
    }
  };

  // 구매하지 않은 경우 (content가 null)
  if (!hasPurchased || !content) {
    return (
      <div className="relative">
        {/* Blur 처리된 원문 영역 */}
        <div className="relative bg-gray-900 border border-gray-800 rounded-[32px] p-8 overflow-hidden">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono blur-sm select-none">
            {content || '프롬프트 원문이 여기에 표시됩니다...'}
          </pre>

          {/* 오버레이 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-white">
                {t('purchaseToView')}
              </p>
              <p className="text-sm text-gray-400">
                구매하시면 프롬프트 원문을 확인할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 구매한 경우 (content 존재)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {t('originalPrompt')}
        </h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 hover:brightness-110 text-white rounded-[32px] transition-all shadow-lg shadow-primary/20"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>{t('copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>{t('copyPrompt')}</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-950 p-4 rounded border border-gray-800 overflow-x-auto">
        {content}
      </pre>
    </div>
  );
}



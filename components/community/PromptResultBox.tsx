'use client';

import { MessageSquare, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * 프롬프트 결과 박스 컴포넌트
 * 커뮤니티 게시글 내에서 프롬프트 입력과 AI 응답을 구분하여 표시
 */
interface PromptResultBoxProps {
  input: string | ReactNode;
  output: string | ReactNode;
}

export default function PromptResultBox({ input, output }: PromptResultBoxProps) {
  return (
    <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-lg shadow-primary/5 my-6">
      {/* 좌측 Jade Green 라인 */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-2xl" />

      <div className="pl-4 space-y-4">
        {/* 입력 영역 */}
        <div className="bg-gray-50/5 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-gray-300">프롬프트 입력</h4>
          </div>
          <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
            {typeof input === 'string' ? input : input}
          </div>
        </div>

        {/* 출력 영역 */}
        <div className="bg-gray-50/10 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-gray-300">AI 응답</h4>
          </div>
          <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
            {typeof output === 'string' ? output : output}
          </div>
        </div>
      </div>
    </div>
  );
}


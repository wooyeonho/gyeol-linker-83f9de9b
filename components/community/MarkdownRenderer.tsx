'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PromptResultBox from './PromptResultBox';

/**
 * 커뮤니티 게시글용 마크다운 렌더러
 * > [!RESULT] 구문을 PromptResultBox로 변환
 */
interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // > [!RESULT] 블록을 파싱하여 PromptResultBox로 변환
  const parseResultBlock = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // > [!RESULT]로 시작하는 블록을 찾는 정규식
    const resultBlockRegex = />\s*\[!RESULT\]\s*\n((?:>.*\n?)*?)(?=\n\n|\n[^>]|$)/gs;
    let lastIndex = 0;
    let match;

    while ((match = resultBlockRegex.exec(text)) !== null) {
      // 결과 블록 이전의 일반 텍스트
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push(
            <ReactMarkdown
              key={`text-${lastIndex}`}
              remarkPlugins={[remarkGfm]}
              components={defaultComponents}
            >
              {beforeText}
            </ReactMarkdown>
          );
        }
      }

      // 결과 블록 파싱
      const blockContent = match[1];
      // INPUT: 또는 OUTPUT: 라인 찾기
      const inputMatch = blockContent.match(/>\s*INPUT:\s*(.*?)(?=\n>\s*OUTPUT:|\n*$)/s);
      const outputMatch = blockContent.match(/>\s*OUTPUT:\s*(.*?)(?=\n>\s*INPUT:|\n*$)/s);

      const input = inputMatch
        ? inputMatch[1].replace(/^>\s*/gm, '').trim()
        : '';
      const output = outputMatch
        ? outputMatch[1].replace(/^>\s*/gm, '').trim()
        : '';

      if (input || output) {
        parts.push(
          <PromptResultBox
            key={`result-${match.index}`}
            input={input}
            output={output}
          />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // 마지막 일반 텍스트
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      if (afterText.trim()) {
        parts.push(
          <ReactMarkdown
            key={`text-${lastIndex}`}
            remarkPlugins={[remarkGfm]}
            components={defaultComponents}
          >
            {afterText}
          </ReactMarkdown>
        );
      }
    }

    return parts.length > 0 ? parts : [];
  };

  // 기본 마크다운 컴포넌트 스타일
  const defaultComponents = {
    p: ({ children }: any) => (
      <p className="mb-4 leading-relaxed text-gray-300">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold text-white mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-bold text-white mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold text-white mb-2 mt-4">{children}</h3>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed">{children}</li>
    ),
    code: ({ children, className }: any) => {
      const isInline = !className;
      return isInline ? (
        <code className="px-1.5 py-0.5 bg-gray-800 rounded text-primary text-sm">
          {children}
        </code>
      ) : (
        <code className="block p-4 bg-gray-800 rounded-xl text-gray-200 text-sm overflow-x-auto">
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre className="mb-4">{children}</pre>
    ),
    blockquote: ({ children }: any) => {
      // [!RESULT] 블록은 이미 파싱되었으므로 일반 blockquote로 처리
      const content = String(children);
      if (content.includes('[!RESULT]')) {
        return null; // 이미 처리됨
      }
      return (
        <blockquote className="border-l-4 border-gray-700 pl-4 italic text-gray-400 my-4">
          {children}
        </blockquote>
      );
    },
    a: ({ children, href }: any) => (
      <a
        href={href}
        className="text-primary hover:text-primary-600 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic">{children}</em>
    ),
  };

  // 결과 블록이 있는지 확인
  const hasResultBlock = />\s*\[!RESULT\]/.test(content);

  if (hasResultBlock) {
    const parsed = parseResultBlock(content);
    return <div className="prose prose-invert max-w-none">{parsed}</div>;
  }

  // 일반 마크다운 렌더링
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={defaultComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


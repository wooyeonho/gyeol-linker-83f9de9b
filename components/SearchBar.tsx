'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * 검색 바 컴포넌트
 * 실시간 검색 기능 (debounced)
 * 키보드 단축키 지원 (Ctrl/Cmd + K)
 */
export default function SearchBar() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Ctrl/Cmd + K 단축키로 검색창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const performSearch = async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // TODO: 실제 검색 API 호출로 교체
      // 현재는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 샘플 제안 (실제로는 API에서 가져옴)
      const mockSuggestions = [
        `${searchQuery} 프롬프트`,
        `${searchQuery} 템플릿`,
        `${searchQuery} 가이드`,
      ].filter((s) => s.length > 0);

      setSuggestions(mockSuggestions);
      setIsSearching(false);
    };

    performSearch(debouncedQuery);
  }, [debouncedQuery]);

  // Input change handler
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      setIsSearching(false);
    }
  }, []);

  // 검색 실행
  const handleSearch = useCallback(
    (searchQuery?: string) => {
      const finalQuery = searchQuery || query.trim();
      if (!finalQuery) {
        addToast({ type: 'warning', message: '검색어를 입력해주세요.' });
        return;
      }

      router.push(`/${locale}/prompts?search=${encodeURIComponent(finalQuery)}`);
      setShowSuggestions(false);
      inputRef.current?.blur();
    },
    [query, locale, router, addToast]
  );

  // Enter 키 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        // 첫 번째 제안으로 포커스 이동 (향후 구현)
      }
    },
    [handleSearch, suggestions]
  );

  return (
    <div className="flex-1 max-w-2xl relative">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // 제안 클릭을 위해 약간의 지연
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          className="w-full pl-12 pr-12 py-3 bg-gray-900 border border-gray-800 rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" aria-hidden="true" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
          )}
          {/* 키보드 단축키 힌트 */}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 검색 제안 */}
      <AnimatePresence>
        {showSuggestions && (query.trim() || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-800 rounded-[24px] shadow-xl z-50 max-h-96 overflow-y-auto"
            role="listbox"
          >
            {suggestions.length > 0 ? (
              <ul className="py-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSearch(suggestion)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                      role="option"
                    >
                      <Search className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      <span>{suggestion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim() && !isSearching ? (
              <div className="px-4 py-3 text-gray-400 text-sm">
                검색 결과가 없습니다. Enter를 눌러 전체 검색을 시도하세요.
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


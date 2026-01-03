'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { X, Search } from 'lucide-react';

/**
 * 프롬프트 검색 컴포넌트
 */
export default function PromptSearch({
  selectedPromptId,
  onSelect,
}: {
  selectedPromptId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const t = useTranslations('community');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 선택된 프롬프트 로드
  useEffect(() => {
    if (selectedPromptId) {
      loadPrompt(selectedPromptId);
    }
  }, [selectedPromptId]);

  const loadPrompt = async (promptId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('prompts')
      .select('id, title_ko, title_en, slug')
      .eq('id', promptId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .single();

    if (data) {
      setSelectedPrompt(data);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();

    const { data } = await supabase
      .from('prompts')
      .select('id, title_ko, title_en, slug')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .or(`title_ko.ilike.%${query}%,title_en.ilike.%${query}%`)
      .limit(10);

    setResults(data || []);
    setIsSearching(false);
  };

  const handleSelect = (prompt: any) => {
    setSelectedPrompt(prompt);
    onSelect(prompt.id);
    setSearch('');
    setResults([]);
  };

  const handleRemove = () => {
    setSelectedPrompt(null);
    onSelect(null);
  };

  return (
    <div className="space-y-2">
      {selectedPrompt ? (
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <span className="text-white">
            {selectedPrompt.title_ko || selectedPrompt.title_en}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder={t('searchPrompt')}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => handleSelect(prompt)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors"
                >
                  <div className="text-white text-sm">
                    {prompt.title_ko || prompt.title_en}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



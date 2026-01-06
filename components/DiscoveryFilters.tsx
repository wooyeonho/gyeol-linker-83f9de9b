'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Filter, 
  X, 
  ChevronDown, 
  Star, 
  Sparkles,
  Flame,
  DollarSign,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { AI_MODELS, CATEGORIES } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

type SortType = 'popular' | 'rating' | 'sales' | 'newest';

interface FilterState {
  aiModel: string[];
  category: string[];
  priceRange: [number, number];
  minRating: number;
  sort: SortType;
}

const PRICE_RANGES = [
  { id: 'all', min: 0, max: 999, label_en: 'All Prices', label_ko: '전체 가격' },
  { id: 'under10', min: 0, max: 10, label_en: 'Under $10', label_ko: '$10 미만' },
  { id: '10to30', min: 10, max: 30, label_en: '$10 - $30', label_ko: '$10 - $30' },
  { id: '30to50', min: 30, max: 50, label_en: '$30 - $50', label_ko: '$30 - $50' },
  { id: 'over50', min: 50, max: 999, label_en: '$50+', label_ko: '$50 이상' },
];

const RATING_OPTIONS = [
  { value: 0, label_en: 'All Ratings', label_ko: '전체 평점' },
  { value: 4, label_en: '4+ Stars', label_ko: '4점 이상' },
  { value: 4.5, label_en: '4.5+ Stars', label_ko: '4.5점 이상' },
];

/**
 * Premium Discovery Filters Component
 * Apple-style minimalist design with Stitch Design System
 */
const DiscoveryFilters = memo(function DiscoveryFilters({ locale }: { locale: string }) {
  const t = useTranslations('discovery');
  const tHome = useTranslations('home');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Mobile filter panel state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Parse current filters from URL
  const currentSort = (searchParams.get('sort') || 'popular') as SortType;
  const currentModels = searchParams.get('models')?.split(',').filter(Boolean) || [];
  const currentCategories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const currentPriceRange = searchParams.get('price') || 'all';
  const currentMinRating = parseFloat(searchParams.get('rating') || '0');
  
  // Count active filters
  const activeFilterCount = 
    currentModels.length + 
    currentCategories.length + 
    (currentPriceRange !== 'all' ? 1 : 0) + 
    (currentMinRating > 0 ? 1 : 0);

  // Update URL with new filters
  const updateFilters = useCallback((updates: Partial<{
    sort: SortType;
    models: string[];
    categories: string[];
    price: string;
    rating: number;
  }>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.sort !== undefined) {
      params.set('sort', updates.sort);
    }
    if (updates.models !== undefined) {
      if (updates.models.length > 0) {
        params.set('models', updates.models.join(','));
      } else {
        params.delete('models');
      }
    }
    if (updates.categories !== undefined) {
      if (updates.categories.length > 0) {
        params.set('categories', updates.categories.join(','));
      } else {
        params.delete('categories');
      }
    }
    if (updates.price !== undefined) {
      if (updates.price !== 'all') {
        params.set('price', updates.price);
      } else {
        params.delete('price');
      }
    }
    if (updates.rating !== undefined) {
      if (updates.rating > 0) {
        params.set('rating', updates.rating.toString());
      } else {
        params.delete('rating');
      }
    }
    
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    router.push(pathname);
    setIsMobileOpen(false);
  }, [router, pathname]);

  // Toggle model filter
  const toggleModel = useCallback((modelId: string) => {
    const newModels = currentModels.includes(modelId)
      ? currentModels.filter(m => m !== modelId)
      : [...currentModels, modelId];
    updateFilters({ models: newModels });
  }, [currentModels, updateFilters]);

  // Toggle category filter
  const toggleCategory = useCallback((categoryId: string) => {
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(c => c !== categoryId)
      : [...currentCategories, categoryId];
    updateFilters({ categories: newCategories });
  }, [currentCategories, updateFilters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // Sort buttons
  const sortButtons = [
    { id: 'popular' as SortType, icon: Flame, label: tHome('sortPopular') },
    { id: 'rating' as SortType, icon: Star, label: tHome('sortRating') },
    { id: 'sales' as SortType, icon: DollarSign, label: tHome('sortSales') },
    { id: 'newest' as SortType, icon: Sparkles, label: tHome('sortNewest') },
  ];

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-6">
          {/* Sort Row */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2 text-gray-400">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="font-medium">{t('sortBy') || 'Sort by'}</span>
            </div>
            <div className="flex items-center gap-2">
              {sortButtons.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => updateFilters({ sort: id })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[32px] font-medium transition-all duration-200 ${
                    currentSort === id
                      ? 'bg-[#00A86B] text-white shadow-lg shadow-[#00A86B]/20'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* AI Model Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'model' ? null : 'model');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                  currentModels.length > 0
                    ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-[#00A86B]/30'
                }`}
              >
                <span>{t('aiModel') || 'AI Model'}</span>
                {currentModels.length > 0 && (
                  <span className="w-5 h-5 bg-[#00A86B] text-white text-xs rounded-full flex items-center justify-center">
                    {currentModels.length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'model' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'model' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-3 shadow-2xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {AI_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => toggleModel(model.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[16px] transition-all ${
                            currentModels.includes(model.id)
                              ? 'bg-[#00A86B]/10 text-[#00A86B]'
                              : 'text-gray-300 hover:bg-[#1A1A1A]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{model.icon}</span>
                            <span>{model.name}</span>
                          </span>
                          {currentModels.includes(model.id) && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'category' ? null : 'category');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                  currentCategories.length > 0
                    ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-[#00A86B]/30'
                }`}
              >
                <span>{t('category') || 'Category'}</span>
                {currentCategories.length > 0 && (
                  <span className="w-5 h-5 bg-[#00A86B] text-white text-xs rounded-full flex items-center justify-center">
                    {currentCategories.length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'category' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-3 shadow-2xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[16px] transition-all ${
                            currentCategories.includes(cat.id)
                              ? 'bg-[#00A86B]/10 text-[#00A86B]'
                              : 'text-gray-300 hover:bg-[#1A1A1A]'
                          }`}
                        >
                          <span>{locale === 'ko' ? cat.name_ko : cat.name_en}</span>
                          {currentCategories.includes(cat.id) && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Price Range Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'price' ? null : 'price');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                  currentPriceRange !== 'all'
                    ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-[#00A86B]/30'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('priceRange') || 'Price'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'price' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'price' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-3 shadow-2xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      {PRICE_RANGES.map((range) => (
                        <button
                          key={range.id}
                          onClick={() => updateFilters({ price: range.id })}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[16px] transition-all ${
                            currentPriceRange === range.id
                              ? 'bg-[#00A86B]/10 text-[#00A86B]'
                              : 'text-gray-300 hover:bg-[#1A1A1A]'
                          }`}
                        >
                          <span>{locale === 'ko' ? range.label_ko : range.label_en}</span>
                          {currentPriceRange === range.id && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rating Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'rating' ? null : 'rating');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                  currentMinRating > 0
                    ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-[#00A86B]/30'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>{t('rating') || 'Rating'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'rating' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'rating' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] p-3 shadow-2xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      {RATING_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateFilters({ rating: option.value })}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[16px] transition-all ${
                            currentMinRating === option.value
                              ? 'bg-[#00A86B]/10 text-[#00A86B]'
                              : 'text-gray-300 hover:bg-[#1A1A1A]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {option.value > 0 && (
                              <span className="flex">
                                {Array.from({ length: Math.floor(option.value) }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-[#00A86B] text-[#00A86B]" />
                                ))}
                              </span>
                            )}
                            <span>{locale === 'ko' ? option.label_ko : option.label_en}</span>
                          </span>
                          {currentMinRating === option.value && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium text-gray-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
                <span>{t('clearAll') || 'Clear all'}</span>
                <span className="w-5 h-5 bg-gray-700 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3">
          {/* Sort Dropdown for Mobile */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sortButtons.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => updateFilters({ sort: id })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all whitespace-nowrap ${
                  currentSort === id
                    ? 'bg-[#00A86B] text-white shadow-lg shadow-[#00A86B]/20'
                    : 'bg-[#1A1A1A] text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
          
          {/* Filter Button */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
              activeFilterCount > 0
                ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[#00A86B] text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1A1A1A] rounded-t-[32px] z-50 lg:hidden max-h-[85vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-[#2A2A2A] rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
                <h3 className="text-lg font-semibold text-white">{t('filters') || 'Filters'}</h3>
                <div className="flex items-center gap-4">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[#00A86B] font-medium text-sm"
                    >
                      {t('clearAll') || 'Clear all'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Filter Content */}
              <div className="px-6 py-6 space-y-8 overflow-y-auto max-h-[60vh]">
                {/* AI Model */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">{t('aiModel') || 'AI Model'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                          currentModels.includes(model.id)
                            ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300'
                        }`}
                      >
                        <span>{model.icon}</span>
                        <span>{model.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">{t('category') || 'Category'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                          currentCategories.includes(cat.id)
                            ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300'
                        }`}
                      >
                        {locale === 'ko' ? cat.name_ko : cat.name_en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">{t('priceRange') || 'Price Range'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_RANGES.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => updateFilters({ price: range.id })}
                        className={`px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                          currentPriceRange === range.id
                            ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300'
                        }`}
                      >
                        {locale === 'ko' ? range.label_ko : range.label_en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">{t('rating') || 'Rating'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {RATING_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFilters({ rating: option.value })}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[32px] font-medium transition-all border ${
                          currentMinRating === option.value
                            ? 'bg-[#00A86B]/10 border-[#00A86B]/30 text-[#00A86B]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300'
                        }`}
                      >
                        {option.value > 0 && (
                          <span className="flex">
                            {Array.from({ length: Math.floor(option.value) }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-[#00A86B] text-[#00A86B]" />
                            ))}
                          </span>
                        )}
                        <span>{locale === 'ko' ? option.label_ko : option.label_en}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Apply Button */}
              <div className="px-6 py-4 border-t border-[#1A1A1A]">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full py-4 bg-[#00A86B] text-white rounded-[32px] font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#00A86B]/20"
                >
                  {t('applyFilters') || 'Apply Filters'}
                  {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default DiscoveryFilters;

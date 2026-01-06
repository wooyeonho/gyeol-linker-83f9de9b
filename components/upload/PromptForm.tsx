'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Tag,
  DollarSign,
  Image as ImageIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface PromptFormData {
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  content: string;
  price: number;
  category: string;
  tags: string;
  thumbnail_url: string;
  images: File[];
}

interface PromptFormProps {
  step: number;
  data: PromptFormData;
  onChange: (field: keyof PromptFormData | 'step', value: any) => void;
  onSubmit?: (data: PromptFormData) => void | Promise<void>;
  className?: string;
}

/**
 * 다단계 프롬프트 업로드 폼 컴포넌트
 * 4단계로 구성: 기본 정보 → 내용 & 가격 → 카테고리 & 태그 → 이미지 & 검토
 */
export default function PromptForm({
  step,
  data,
  onChange,
  onSubmit,
  className,
}: PromptFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof PromptFormData, value: any) => {
      onChange(field, value);
    },
    [onChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, field: 'images' | 'thumbnail') => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (field === 'thumbnail') {
        const file = files[0];
        
        // 파일 크기 검증 (최대 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('이미지 크기는 5MB 이하여야 합니다.');
          e.target.value = '';
          return;
        }

        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드 가능합니다.');
          e.target.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
          alert('이미지 읽기 중 오류가 발생했습니다.');
          e.target.value = '';
        };
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          handleChange('thumbnail_url', reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // 여러 이미지 검증
        const validFiles = Array.from(files).filter((file) => {
          if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name}의 크기가 5MB를 초과합니다.`);
            return false;
          }
          if (!file.type.startsWith('image/')) {
            alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
            return false;
          }
          return true;
        });
        
        if (validFiles.length > 0) {
          handleChange('images', validFiles);
        } else {
          e.target.value = '';
        }
      }
    },
    [handleChange]
  );

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      // 에러 처리는 상위 컴포넌트에서 처리
    } finally {
      setIsSubmitting(false);
    }
  }, [data, onSubmit]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return data.title_ko.trim() && data.title_en.trim();
      case 2:
        return data.content.trim() && data.price > 0;
      case 3:
        return data.category.trim();
      case 4:
        return true; // 이미지는 선택사항
      default:
        return false;
    }
  }, [step, data]);

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-[32px] p-4 md:p-6 lg:p-8 space-y-6',
        className
      )}
    >
      <h2 className="text-xl md:text-2xl font-semibold text-white tracking-[-0.02em] mb-4">
        {step === 1 && 'Basic Information'}
        {step === 2 && 'Content & Price'}
        {step === 3 && 'Category & Tags'}
        {step === 4 && 'Images & Review'}
      </h2>

      <div className="space-y-4 md:space-y-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Title (Korean) <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm md:text-base"
                value={data.title_ko}
                onChange={(e) => handleChange('title_ko', e.target.value)}
                placeholder="프롬프트 제목 (한국어)"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Title (English) <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm md:text-base"
                value={data.title_en}
                onChange={(e) => handleChange('title_en', e.target.value)}
                placeholder="Prompt Title (English)"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Description (Korean) <span className="text-primary">*</span>
              </label>
              <textarea
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-24 md:h-32 text-sm md:text-base resize-none"
                value={data.description_ko}
                onChange={(e) => handleChange('description_ko', e.target.value)}
                placeholder="프롬프트 설명 (한국어)"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Description (English) <span className="text-primary">*</span>
              </label>
              <textarea
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-24 md:h-32 text-sm md:text-base resize-none"
                value={data.description_en}
                onChange={(e) => handleChange('description_en', e.target.value)}
                placeholder="Prompt Description (English)"
                required
              />
            </div>
          </>
        )}

        {/* Step 2: Content & Price */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Prompt Content <span className="text-primary">*</span>
              </label>
              <textarea
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-40 md:h-48 font-mono text-sm md:text-base resize-none"
                value={data.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="AI 프롬프트의 핵심 내용을 입력하세요..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                * 프롬프트 원문은 구매 후에만 공개됩니다.
              </p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Price (₩) <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  className="w-full pl-10 pr-3 md:pr-4 py-3 md:py-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm md:text-base"
                  value={data.price || ''}
                  onChange={(e) =>
                    handleChange('price', parseFloat(e.target.value) || 0)
                  }
                  placeholder="10000"
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                최소 가격: ₩1,000
              </p>
            </div>
          </>
        )}

        {/* Step 3: Category & Tags */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Category <span className="text-primary">*</span>
              </label>
              <select
                className="w-full p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm md:text-base"
                value={data.category}
                onChange={(e) => handleChange('category', e.target.value)}
                required
              >
                <option value="">Select a category</option>
                <option value="content_generation">Content Generation</option>
                <option value="code_assistant">Code Assistant</option>
                <option value="image_generation">Image Generation</option>
                <option value="marketing">Marketing</option>
                <option value="productivity">Productivity</option>
                <option value="education">Education</option>
                <option value="creative_writing">Creative Writing</option>
                <option value="data_analysis">Data Analysis</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Tags (comma separated)
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 md:pr-4 py-3 md:py-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm md:text-base"
                  value={data.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="seo, marketing, creative, gpt-4"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                쉼표로 구분하여 여러 태그를 입력하세요.
              </p>
            </div>
          </>
        )}

        {/* Step 4: Images & Review */}
        {step === 4 && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Thumbnail Image
              </label>
              <label
                htmlFor="thumbnail-upload"
                className="relative w-full h-32 md:h-40 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={imagePreview}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover rounded-lg"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setImagePreview(null);
                        handleChange('thumbnail_url', '');
                        const input = document.getElementById('thumbnail-upload') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="absolute top-2 right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-gray-700 border border-gray-700 transition-colors"
                      aria-label="Remove thumbnail"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mb-2" />
                    <span className="text-gray-400 text-sm md:text-base">
                      Drag & Drop or Click to Upload
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Max 5MB, JPG/PNG/WebP
                    </span>
                  </>
                )}
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, 'thumbnail')}
                />
              </label>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Result Images (Optional)
              </label>
              <label
                htmlFor="result-images-upload"
                className="w-full p-4 md:p-6 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mr-2" />
                <span className="text-gray-400 text-sm md:text-base">
                  Upload Result Samples
                </span>
                <input
                  id="result-images-upload"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, 'images')}
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Before/After 결과물 샘플을 업로드하세요. (선택사항, 최대 5MB/파일)
              </p>
              {data.images.length > 0 && (
                <div className="mt-2 text-xs text-primary">
                  {data.images.length}개 파일 선택됨
                </div>
              )}
            </div>

            {/* 최종 검토 */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3">
                Review Your Submission
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Title:</span>
                  <span className="text-white">
                    {data.title_ko || data.title_en || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="text-white">
                    ₩{Math.floor(data.price).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="text-white">{data.category || 'Not set'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-800">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => onChange('step', step - 1)}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 transition-all duration-200 text-sm md:text-base min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
        ) : (
          <div /> // 공간 유지
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => onChange('step', step + 1)}
            disabled={!canProceed()}
            className={cn(
              'flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-[32px] font-semibold hover:bg-primary-600 transition-all duration-200 text-sm md:text-base min-h-[44px] ml-auto',
              !canProceed() && 'opacity-50 cursor-not-allowed'
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            className={cn(
              'flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-[32px] font-semibold hover:bg-primary-600 transition-all duration-200 text-sm md:text-base min-h-[44px] ml-auto',
              (isSubmitting || !canProceed()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Prompt'}
            <Upload className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}


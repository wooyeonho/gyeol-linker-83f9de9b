'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { createPrompt } from '@/app/actions/prompts';
import Image from 'next/image';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Check,
  FileText,
  Globe,
  DollarSign,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/utils/currency';

// Step definitions
const STEPS = [
  { id: 1, key: 'basicInfo', icon: Globe },
  { id: 2, key: 'korean', icon: FileText },
  { id: 3, key: 'content', icon: DollarSign },
  { id: 4, key: 'preview', icon: Eye },
];

/**
 * Enhanced Multi-step Prompt Form
 * 4-step flow: EN -> KO -> Content & Pricing -> Preview
 * Stitch Design System compliant
 */
export default function EnhancedPromptForm() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('promptForm');
  const { addToast } = useToast();

  // Current step (1-4)
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [titleKo, setTitleKo] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [categoryKo, setCategoryKo] = useState('');
  const [categoryEn, setCategoryEn] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);

  // Upload state
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [resultImagesUploading, setResultImagesUploading] = useState(false);
  const [resultImagesProgress, setResultImagesProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // File input refs
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const resultImagesInputRef = useRef<HTMLInputElement>(null);

  /**
   * Image upload function
   */
  const uploadImage = async (
    file: File,
    type: 'thumbnail' | 'result',
    index?: number
  ): Promise<string> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required');
    }

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${type}${index !== undefined ? `_${index}` : ''}.${fileExt}`;
    const filePath = `public/prompts/${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('prompts')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('prompts').getPublicUrl(filePath);
    return publicUrl;
  };

  /**
   * Thumbnail upload handler
   */
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File size must be under 5MB' });
      return;
    }

    setThumbnailUploading(true);
    setThumbnailProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setThumbnailProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 100);

      const url = await uploadImage(file, 'thumbnail');
      setThumbnailUrl(url);
      setThumbnailProgress(100);
      clearInterval(progressInterval);
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      addToast({ type: 'error', message: 'Failed to upload thumbnail' });
      setThumbnailProgress(0);
    } finally {
      setThumbnailUploading(false);
    }
  };

  /**
   * Result images upload handler
   */
  const handleResultImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setResultImagesUploading(true);
    setResultImagesProgress(0);

    try {
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          addToast({ type: 'error', message: `${file.name} exceeds 5MB limit` });
          continue;
        }

        const url = await uploadImage(file, 'result', i);
        uploadedUrls.push(url);
        setResultImagesProgress(((i + 1) / totalFiles) * 100);
      }

      setResultImages([...resultImages, ...uploadedUrls]);
    } catch (error) {
      console.error('Result images upload error:', error);
      addToast({ type: 'error', message: 'Failed to upload images' });
    } finally {
      setResultImagesUploading(false);
    }
  };

  /**
   * Tag handlers
   */
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleRemoveResultImage = (index: number) => {
    setResultImages(resultImages.filter((_, i) => i !== index));
  };

  /**
   * Step validation
   */
  const validateStep = useCallback((step: number): string | null => {
    switch (step) {
      case 1:
        if (!titleEn.trim()) return 'Please enter English title';
        if (!descriptionEn.trim()) return 'Please enter English description';
        return null;
      case 2:
        if (!titleKo.trim()) return 'Please enter Korean title';
        if (!descriptionKo.trim()) return 'Please enter Korean description';
        return null;
      case 3:
        if (!content.trim()) return 'Please enter prompt content';
        if (!price || parseFloat(price) < 0.99) return 'Price must be at least $0.99';
        if (!thumbnailUrl) return 'Please upload a thumbnail';
        return null;
      default:
        return null;
    }
  }, [titleEn, descriptionEn, titleKo, descriptionKo, content, price, thumbnailUrl]);

  /**
   * Navigation handlers
   */
  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      addToast({ type: 'warning', message: error });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    // Only allow going to completed steps or current step
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  /**
   * Form submission
   */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title_ko', titleKo);
      formData.append('title_en', titleEn);
      formData.append('description_ko', descriptionKo);
      formData.append('description_en', descriptionEn);
      formData.append('content', content);
      formData.append('price', price);
      formData.append('thumbnail_url', thumbnailUrl);
      formData.append('result_images', JSON.stringify(resultImages));
      formData.append('tags', JSON.stringify(tags));
      if (aiModel) formData.append('ai_model', aiModel);
      if (categoryKo) formData.append('category_ko', categoryKo);
      if (categoryEn) formData.append('category_en', categoryEn);

      const result = await createPrompt(formData);

      if (result.error) {
        addToast({ type: 'error', message: result.error });
        setSubmitting(false);
        return;
      }

      addToast({ type: 'success', message: t('registerSuccess') });
      router.push(`/${locale}/prompts/${result.slug}`);
    } catch (error) {
      console.error('Prompt creation error:', error);
      addToast({ type: 'error', message: t('registerFailed') });
      setSubmitting(false);
    }
  }, [titleKo, titleEn, descriptionKo, descriptionEn, content, price, thumbnailUrl, resultImages, tags, aiModel, categoryKo, categoryEn, locale, router, t, addToast]);

  /**
   * Progress bar component
   */
  const ProgressBar = () => (
    <div className="mb-12">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-800 rounded-full" />
        <div 
          className="absolute top-6 left-0 h-1 bg-[#00A86B] rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />
        
        {/* Step indicators */}
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              disabled={step.id > currentStep}
              className="relative z-10 flex flex-col items-center gap-3"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#00A86B] text-white'
                    : isCurrent
                    ? 'bg-[#00A86B]/20 text-[#00A86B] border-2 border-[#00A86B]'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isCurrent ? 'text-[#00A86B]' : isCompleted ? 'text-white' : 'text-gray-500'
                }`}
              >
                {t(`step${step.id}Title`) || `Step ${step.id}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /**
   * Step 1: Basic Info (English)
   */
  const Step1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Basic Information (English)</h2>
        <p className="text-gray-400">Start with the English version of your prompt</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Title (English) <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          maxLength={100}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="Enter a compelling title for your prompt"
        />
        <p className="mt-2 text-xs text-gray-500">{titleEn.length}/100</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description (English) <span className="text-red-400">*</span>
        </label>
        <textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          rows={5}
          maxLength={500}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent resize-none transition-all"
          placeholder="Describe what your prompt does and the value it provides"
        />
        <p className="mt-2 text-xs text-gray-500">{descriptionEn.length}/500</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Category (English) <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={categoryEn}
          onChange={(e) => setCategoryEn(e.target.value)}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="e.g., Marketing, Design, Development"
        />
      </div>
    </motion.div>
  );

  /**
   * Step 2: Korean Translation
   */
  const Step2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Korean Translation</h2>
        <p className="text-gray-400">Add the Korean version for bilingual support</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Title (Korean) <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={titleKo}
          onChange={(e) => setTitleKo(e.target.value)}
          maxLength={100}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="프롬프트 제목을 입력하세요"
        />
        <p className="mt-2 text-xs text-gray-500">{titleKo.length}/100</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description (Korean) <span className="text-red-400">*</span>
        </label>
        <textarea
          value={descriptionKo}
          onChange={(e) => setDescriptionKo(e.target.value)}
          rows={5}
          maxLength={500}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent resize-none transition-all"
          placeholder="프롬프트에 대한 상세 설명을 입력하세요"
        />
        <p className="mt-2 text-xs text-gray-500">{descriptionKo.length}/500</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Category (Korean) <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={categoryKo}
          onChange={(e) => setCategoryKo(e.target.value)}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="예: 마케팅, 디자인, 개발"
        />
      </div>
    </motion.div>
  );

  /**
   * Step 3: Content & Pricing
   */
  const Step3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Content & Pricing</h2>
        <p className="text-gray-400">Add your prompt content and set your price</p>
      </div>

      {/* Prompt Content */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Prompt Content <span className="text-red-400">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[24px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent resize-none font-mono text-sm transition-all"
          placeholder="Enter your full prompt content here..."
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Price (USD) <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
          <input
            type="number"
            step="0.01"
            min="0.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full pl-10 pr-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent text-lg"
            placeholder="29.99"
          />
        </div>
        <p className="mt-2 text-sm text-gray-400">Minimum price: $0.99 | You earn 80% ({price ? formatPrice(parseFloat(price) * 0.8) : '$0.00'})</p>
      </div>

      {/* AI Model */}
      <div>
        <label className="block text-sm font-medium mb-2">
          AI Model <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="e.g., GPT-4, Claude, Midjourney"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          className="w-full px-4 py-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent transition-all"
          placeholder="Press Enter to add tags"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1 bg-[#00A86B]/20 text-[#00A86B] rounded-full text-sm font-medium"
              >
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Thumbnail <span className="text-red-400">*</span>
        </label>
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          onChange={handleThumbnailUpload}
          className="hidden"
        />
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={thumbnailUploading}
            className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] hover:border-[#00A86B] transition-all disabled:opacity-50"
          >
            {thumbnailUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#00A86B]" />
            ) : (
              <Upload className="w-5 h-5 text-[#00A86B]" />
            )}
            <span>Upload Thumbnail</span>
          </button>
          {thumbnailUrl && (
            <div className="relative w-24 h-24 border border-[#1A1A1A] rounded-[16px] overflow-hidden">
              <Image src={thumbnailUrl} alt="Thumbnail" fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => setThumbnailUrl('')}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {thumbnailUploading && (
          <div className="mt-3 w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#00A86B] transition-all" style={{ width: `${thumbnailProgress}%` }} />
          </div>
        )}
      </div>

      {/* Result Images */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Result Images <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          ref={resultImagesInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleResultImagesUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => resultImagesInputRef.current?.click()}
          disabled={resultImagesUploading}
          className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] hover:border-[#00A86B] transition-all disabled:opacity-50"
        >
          {resultImagesUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#00A86B]" />
          ) : (
            <ImageIcon className="w-5 h-5 text-[#00A86B]" />
          )}
          <span>Add Result Images</span>
        </button>
        {resultImages.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {resultImages.map((url, index) => (
              <div key={url} className="relative aspect-square border border-[#1A1A1A] rounded-[16px] overflow-hidden">
                <Image src={url} alt={`Result ${index + 1}`} fill className="object-cover" sizes="25vw" />
                <button
                  type="button"
                  onClick={() => handleRemoveResultImage(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  /**
   * Step 4: Preview
   */
  const Step4 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Preview & Submit</h2>
        <p className="text-gray-400">Review your prompt before publishing</p>
      </div>

      {/* Preview Card */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] overflow-hidden">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="relative w-full aspect-video">
            <Image src={thumbnailUrl} alt="Preview" fill className="object-cover" sizes="100vw" />
            <div className="absolute top-4 right-4 bg-[#00A86B] px-4 py-2 rounded-full text-white font-bold text-lg">
              {formatPrice(parseFloat(price) || 0)}
            </div>
          </div>
        )}
        
        <div className="p-8">
          {/* Title */}
          <h3 className="text-2xl font-bold mb-2">{titleEn || 'Untitled Prompt'}</h3>
          <p className="text-gray-400 text-sm mb-4">{titleKo}</p>
          
          {/* Description */}
          <p className="text-gray-300 mb-6 leading-relaxed">{descriptionEn}</p>
          
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
            {aiModel && (
              <span className="px-3 py-1 bg-[#1A1A1A] rounded-full">{aiModel}</span>
            )}
            {categoryEn && (
              <span className="px-3 py-1 bg-[#1A1A1A] rounded-full">{categoryEn}</span>
            )}
          </div>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-[#00A86B]/10 text-[#00A86B] rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Earnings breakdown */}
          <div className="bg-[#1A1A1A] rounded-[24px] p-6">
            <h4 className="font-semibold mb-4">Earnings Breakdown</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Sale Price</span>
                <span className="font-medium">{formatPrice(parseFloat(price) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform Fee (20%)</span>
                <span className="text-red-400">-{formatPrice((parseFloat(price) || 0) * 0.2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="font-semibold">Your Earnings (80%)</span>
                <span className="font-bold text-[#00A86B] text-lg">{formatPrice((parseFloat(price) || 0) * 0.8)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Images Preview */}
      {resultImages.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4">Result Images ({resultImages.length})</h4>
          <div className="grid grid-cols-4 gap-4">
            {resultImages.map((url, index) => (
              <div key={url} className="relative aspect-square border border-[#1A1A1A] rounded-[16px] overflow-hidden">
                <Image src={url} alt={`Result ${index + 1}`} fill className="object-cover" sizes="25vw" />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t('title')}</h1>
        <p className="text-lg text-gray-400">Create and sell your premium AI prompts</p>
      </motion.div>

      {/* Progress Bar */}
      <ProgressBar />

      {/* Form Card */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && <Step1 key="step1" />}
          {currentStep === 2 && <Step2 key="step2" />}
          {currentStep === 3 && <Step3 key="step3" />}
          {currentStep === 4 && <Step4 key="step4" />}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-[#1A1A1A]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[32px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-[#00A86B] hover:brightness-110 rounded-[32px] text-white font-semibold transition-all shadow-lg shadow-[#00A86B]/20"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-[#00A86B] hover:brightness-110 rounded-[32px] text-white font-semibold transition-all shadow-lg shadow-[#00A86B]/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Publish Prompt</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { createPrompt } from '@/app/actions/prompts';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

/**
 * 프롬프트 등록 폼 컴포넌트 (클라이언트)
 */
export default function PromptForm() {
  const router = useRouter();
  const t = useTranslations('promptForm');
  const tCommon = useTranslations('common');

  // 폼 상태
  const [titleKo, setTitleKo] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [resultVideoUrl, setResultVideoUrl] = useState('');

  // 업로드 상태
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [resultImagesUploading, setResultImagesUploading] = useState(false);
  const [resultImagesProgress, setResultImagesProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // 파일 입력 ref
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const resultImagesInputRef = useRef<HTMLInputElement>(null);

  /**
   * 이미지 업로드 함수
   */
  const uploadImage = async (
    file: File,
    type: 'thumbnail' | 'result',
    index?: number
  ): Promise<string> => {
    const supabase = createClient();

    // 사용자 ID 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    // 파일 경로 생성
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${type}${index !== undefined ? `_${index}` : ''}.${fileExt}`;
    const filePath = `public/prompts/${user.id}/${fileName}`;

    // 파일 업로드
    const { data, error } = await supabase.storage
      .from('prompts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from('prompts').getPublicUrl(filePath);

    return publicUrl;
  };

  /**
   * 썸네일 업로드 핸들러
   */
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setThumbnailUploading(true);
    setThumbnailProgress(0);

    try {
      // Progress 시뮬레이션 (실제로는 Supabase가 진행률을 제공하지 않으므로)
      const progressInterval = setInterval(() => {
        setThumbnailProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const url = await uploadImage(file, 'thumbnail');
      setThumbnailUrl(url);
      setThumbnailProgress(100);
      clearInterval(progressInterval);
    } catch (error) {
      console.error('썸네일 업로드 오류:', error);
      alert('썸네일 업로드에 실패했습니다.');
      setThumbnailProgress(0);
    } finally {
      setThumbnailUploading(false);
    }
  };

  /**
   * 결과물 이미지 업로드 핸들러
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

        // 파일 크기 검증 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}의 파일 크기는 5MB 이하여야 합니다.`);
          continue;
        }

        // Progress 시뮬레이션
        const progressInterval = setInterval(() => {
          setResultImagesProgress((prev) => {
            const baseProgress = (i / totalFiles) * 100;
            const fileProgress = (prev % 100) + 5;
            if (fileProgress >= 90) {
              clearInterval(progressInterval);
              return baseProgress + 90;
            }
            return baseProgress + fileProgress;
          });
        }, 50);

        const url = await uploadImage(file, 'result', i);
        uploadedUrls.push(url);
        clearInterval(progressInterval);
      }

      setResultImages([...resultImages, ...uploadedUrls]);
      setResultImagesProgress(100);
    } catch (error) {
      console.error('결과물 이미지 업로드 오류:', error);
      alert('결과물 이미지 업로드에 실패했습니다.');
      setResultImagesProgress(0);
    } finally {
      setResultImagesUploading(false);
    }
  };

  /**
   * 태그 추가 핸들러
   */
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  /**
   * 태그 제거 핸들러
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  /**
   * 결과물 이미지 제거 핸들러
   */
  const handleRemoveResultImage = (index: number) => {
    setResultImages(resultImages.filter((_, i) => i !== index));
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!thumbnailUrl) {
      alert('썸네일 이미지를 업로드해주세요.');
      return;
    }

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
      if (resultVideoUrl) {
        formData.append('result_video_url', resultVideoUrl);
      }

      const result = await createPrompt(formData);

      if (result.error) {
        alert(result.error);
        setSubmitting(false);
        return;
      }

      alert(t('registerSuccess'));
      router.push('/seller/dashboard');
    } catch (error) {
      console.error('프롬프트 등록 오류:', error);
      alert(t('registerFailed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 페이지 타이틀 */}
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        {/* 등록 폼 */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 제목 (한국어/영어) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('titleKo')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titleKo}
                onChange={(e) => setTitleKo(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="프롬프트 제목을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('titleEn')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter prompt title"
              />
            </div>
          </div>

          {/* 상세 설명 (한국어/영어) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('descriptionKo')} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={descriptionKo}
                onChange={(e) => setDescriptionKo(e.target.value)}
                required
                rows={5}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="프롬프트에 대한 상세 설명을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('descriptionEn')} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                required
                rows={5}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Enter detailed description"
              />
            </div>
          </div>

          {/* 가격 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('price')} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0.99"
              />
            </div>
            <p className="mt-1 text-sm text-gray-400">{t('minPrice')}</p>
          </div>

          {/* 프롬프트 원문 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('content')} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
              placeholder="프롬프트 원문을 입력하세요"
            />
          </div>

          {/* 태그 입력 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('tags')}</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('tagsPlaceholder')}
            />
            <p className="mt-1 text-sm text-gray-400">
              Enter 키를 눌러 태그를 추가하세요
            </p>
            {/* 태그 배지 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-primary-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 썸네일 업로드 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('thumbnailRequired')} <span className="text-red-400">*</span>
            </label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="hidden"
            />
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={thumbnailUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {thumbnailUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Upload className="w-5 h-5 text-primary" />
                )}
                <span>{t('selectFile')}</span>
              </button>
              {/* Progress Bar */}
              {thumbnailUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{t('uploading')}</span>
                    <span>{thumbnailProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${thumbnailProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {/* 업로드된 이미지 미리보기 */}
              {thumbnailUrl && (
                <div className="relative w-48 h-48 border border-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 결과물 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('resultImagesOptional')}
            </label>
            <input
              ref={resultImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleResultImagesUpload}
              className="hidden"
            />
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => resultImagesInputRef.current?.click()}
                disabled={resultImagesUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resultImagesUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-primary" />
                )}
                <span>{t('selectFile')}</span>
              </button>
              {/* Progress Bar */}
              {resultImagesUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{t('uploading')}</span>
                    <span>{Math.round(resultImagesProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${resultImagesProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {/* 업로드된 이미지 미리보기 */}
              {resultImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {resultImages.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square border border-gray-800 rounded-lg overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Result ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveResultImage(index)}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 결과물 비디오 URL */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('resultVideo')}</label>
            <input
              type="url"
              value={resultVideoUrl}
              onChange={(e) => setResultVideoUrl(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('resultVideoPlaceholder')}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || thumbnailUploading || resultImagesUploading}
              className="px-6 py-3 bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <span>{t('submit')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
  );
}


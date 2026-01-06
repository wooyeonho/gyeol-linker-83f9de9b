'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import ProgressIndicator from '@/components/upload/ProgressIndicator';
import PromptForm, { type PromptFormData } from '@/components/upload/PromptForm';
import LivePreview from '@/components/upload/LivePreview';
import RevenueCalculator from '@/components/upload/RevenueCalculator';
import { createClient } from '@/lib/supabase/client';

/**
 * 업로드 페이지 클라이언트 컴포넌트
 * 다단계 폼, 실시간 미리보기, 수익 계산기 통합
 */
export default function UploadPageClient() {
  const t = useTranslations('upload');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<PromptFormData>({
    title_ko: '',
    title_en: '',
    description_ko: '',
    description_en: '',
    content: '',
    price: 10000,
    category: '',
    tags: '',
    thumbnail_url: '',
    images: [],
  });

  const handleFormChange = useCallback(
    (field: keyof PromptFormData | 'step', value: any) => {
      if (field === 'step') {
        setStep(value);
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (data: PromptFormData) => {
      try {
        const supabase = createClient();

        // 1. 사용자 인증 확인
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
        }

        // 2. 필수 필드 검증
        if (!data.title_ko.trim() || !data.title_en.trim()) {
          throw new Error('제목을 입력해주세요.');
        }
        if (!data.content.trim()) {
          throw new Error('프롬프트 내용을 입력해주세요.');
        }
        if (!data.price || data.price < 1000) {
          throw new Error('가격은 최소 ₩1,000 이상이어야 합니다.');
        }
        if (!data.category) {
          throw new Error('카테고리를 선택해주세요.');
        }

        // 3. 이미지 업로드 (있는 경우)
        let thumbnailUrl = data.thumbnail_url;
        let resultImageUrls: string[] = [];

        // Base64 이미지를 Supabase Storage에 업로드
        if (data.thumbnail_url && data.thumbnail_url.startsWith('data:')) {
          try {
            const base64Data = data.thumbnail_url.split(',')[1];
            const fileExtension = data.thumbnail_url
              .split(';')[0]
              .split('/')[1];
            const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
            const fileBuffer = Buffer.from(base64Data, 'base64');

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('prompt-thumbnails')
              .upload(fileName, fileBuffer, {
                contentType: `image/${fileExtension}`,
                upsert: false,
              });

            if (uploadError) {
              console.warn('Thumbnail upload failed:', uploadError);
              // 썸네일 업로드 실패해도 계속 진행
            } else {
              const { data: urlData } = supabase.storage
                .from('prompt-thumbnails')
                .getPublicUrl(fileName);
              thumbnailUrl = urlData.publicUrl;
            }
          } catch (imageError) {
            console.warn('Image upload error:', imageError);
            // 이미지 업로드 실패해도 계속 진행
          }
        }

        // 4. 프롬프트 데이터 저장
        const tagsArray = data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const { data: prompt, error: insertError } = await supabase
          .from('prompts')
          .insert({
            title_ko: data.title_ko.trim(),
            title_en: data.title_en.trim(),
            description_ko: data.description_ko.trim(),
            description_en: data.description_en.trim(),
            content: data.content.trim(),
            price: Math.floor(data.price),
            category: data.category,
            tags: tagsArray,
            thumbnail_url: thumbnailUrl || null,
            result_images: resultImageUrls,
            seller_id: user.id,
            status: 'pending', // 관리자 승인 대기
          })
          .select()
          .single();

        if (insertError) {
          console.error('Database error:', insertError);
          throw new Error(
            insertError.message || '프롬프트 저장 중 오류가 발생했습니다.'
          );
        }

        // 5. 성공 시 대시보드로 리다이렉트
        router.push('/seller/dashboard?upload=success');
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : '업로드 중 오류가 발생했습니다. 다시 시도해주세요.';
        
        // 사용자에게 에러 표시
        alert(errorMessage);
      }
    },
    [router]
  );

  const sellerRevenue = formData.price * 0.8;
  const platformFee = formData.price * 0.2;

  return (
    <main className="bg-black text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] text-center mb-8 md:mb-12"
        >
          Upload Prompt
        </motion.h1>

        <ProgressIndicator step={step} total={4} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* 폼 영역 (2/3) */}
          <div className="lg:col-span-2">
            <PromptForm
              step={step}
              data={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
            />
          </div>

          {/* 미리보기 영역 (1/3) */}
          <div className="lg:col-span-1 space-y-6 md:space-y-8">
            <LivePreview data={formData} />
            <RevenueCalculator
              price={formData.price}
              sellerRevenue={sellerRevenue}
              platformFee={platformFee}
            />
          </div>
        </div>
      </div>
    </main>
  );
}


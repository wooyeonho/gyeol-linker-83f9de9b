import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendingPrompts } from '@/app/actions/prompts-admin';
import PromptApprovalActions from './PromptApprovalActions';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { checkAdminAccess } from '@/lib/utils/auth';
import { formatDate } from '@/lib/utils/date';

/**
 * 관리자 프롬프트 승인/반려 페이지
 */
export default async function AdminPromptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const supabase = await createClient();

  const redirectPath = `/${locale}`;

  // 관리자 권한 확인
  const { authorized } = await checkAdminAccess();
  if (!authorized) {
    redirect(redirectPath);
  }

  // 3. 대기 중인 프롬프트 조회
  const { prompts, error } = await getPendingPrompts();

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </main>
    );
  }

  // formatDate는 lib/utils/date.ts에서 import

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">대기 중인 프롬프트</h1>
      </div>

      {/* 프롬프트 목록 */}
      {prompts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">대기 중인 프롬프트가 없습니다.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {prompts.map((prompt: any, index: number) => {
            const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
            const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;
            const seller = prompt.seller as any;

            return (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 썸네일 */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
                    {prompt.thumbnail_url ? (
                      <Image
                        src={prompt.thumbnail_url}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-600">
                        <span>이미지 없음</span>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* 제목 및 상태 */}
                    <div>
                      <h2 className="text-xl font-bold mb-2">{title}</h2>
                      <p className="text-gray-400 line-clamp-2">{description}</p>
                    </div>

                    {/* 판매자 정보 */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{seller?.name || '판매자'}</span>
                      <span className="text-gray-600">•</span>
                      <span>{seller?.email || ''}</span>
                    </div>

                    {/* 가격 및 날짜 */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-primary font-bold">
                        ${parseFloat(prompt.price).toFixed(2)}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">
                        {formatDate(prompt.created_at, { locale, includeTime: true })}
                      </span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                      <PromptApprovalActions promptId={prompt.id} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </main>
  );
}


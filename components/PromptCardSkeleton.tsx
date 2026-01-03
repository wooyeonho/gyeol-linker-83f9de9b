/**
 * 프롬프트 카드 스켈레톤 UI
 * 로딩 중 표시
 */
export default function PromptCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden animate-pulse shadow-xl shadow-primary/5">
      {/* 썸네일 스켈레톤 */}
      <div className="w-full h-48 bg-gray-800 rounded-t-[32px]" />

      {/* 내용 스켈레톤 */}
      <div className="p-6 md:p-8 space-y-3">
        {/* 제목 스켈레톤 */}
        <div className="h-6 bg-gray-800 rounded w-3/4" />

        {/* 설명 스켈레톤 */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-5/6" />
        </div>

        {/* 태그 스켈레톤 */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-800 rounded w-16" />
          <div className="h-6 bg-gray-800 rounded w-20" />
          <div className="h-6 bg-gray-800 rounded w-14" />
        </div>

        {/* 하단 정보 스켈레톤 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-4 bg-gray-800 rounded w-12" />
            <div className="h-4 bg-gray-800 rounded w-8" />
          </div>
          <div className="h-6 bg-gray-800 rounded w-16" />
        </div>
      </div>
    </div>
  );
}


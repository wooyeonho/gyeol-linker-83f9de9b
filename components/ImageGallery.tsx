'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 이미지 갤러리 컴포넌트
 * 썸네일과 결과 이미지 슬라이더
 */
export default function ImageGallery({
  thumbnail,
  images,
  videoUrl,
}: {
  thumbnail: string;
  images: string[];
  videoUrl?: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const allImages = [thumbnail, ...images].filter(Boolean);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (allImages.length === 0 && !videoUrl) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">이미지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* 비디오가 있으면 비디오 표시 */}
      {videoUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-900">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          >
            비디오를 재생할 수 없습니다.
          </video>
        </div>
      )}

      {/* 이미지 갤러리 */}
      {allImages.length > 0 && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900">
          <img
            src={allImages[currentIndex]}
            alt={`이미지 ${currentIndex + 1}`}
            className="w-full h-full object-contain"
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          />

          {/* 네비게이션 버튼 */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                aria-label="다음 이미지"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* 인디케이터 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-primary w-8'
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`이미지 ${index + 1}로 이동`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


'use client';

import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueCalculatorProps {
  price: number;
  sellerRevenue: number;
  platformFee: number;
  className?: string;
}

/**
 * 수익 계산기 컴포넌트
 * 판매자가 받을 수익(80%)과 플랫폼 수수료(20%)를 투명하게 표시
 */
export default function RevenueCalculator({
  price,
  sellerRevenue,
  platformFee,
  className,
}: RevenueCalculatorProps) {
  const priceDisplay = `₩${Math.floor(price).toLocaleString('ko-KR')}`;
  const sellerRevenueDisplay = `₩${Math.floor(sellerRevenue).toLocaleString('ko-KR')}`;
  const platformFeeDisplay = `₩${Math.floor(platformFee).toLocaleString('ko-KR')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-[32px] p-4 md:p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="text-base md:text-lg font-semibold text-white tracking-[-0.02em]">
          Revenue Calculation
        </h3>
      </div>

      <div className="space-y-3">
        {/* 판매 가격 */}
        <div className="flex justify-between items-center text-white">
          <span className="text-sm md:text-base text-gray-300">Your Price:</span>
          <span className="font-semibold text-base md:text-lg">{priceDisplay}</span>
        </div>

        {/* 판매자 수익 (80%) */}
        <div className="flex justify-between items-center text-white pt-2 border-t border-gray-800">
          <span className="text-sm md:text-base text-gray-300">
            You Receive (80%):
          </span>
          <span className="font-bold text-primary text-lg md:text-xl">
            {sellerRevenueDisplay}
          </span>
        </div>

        {/* 플랫폼 수수료 (20%) */}
        <div className="flex justify-between items-center text-gray-400 text-xs md:text-sm pt-1">
          <span>Platform Fee (20%):</span>
          <span>{platformFeeDisplay}</span>
        </div>
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">
        * 표시된 가격이 최종 가격입니다. 구매자에게 추가 비용이 없습니다.
      </p>
    </motion.div>
  );
}




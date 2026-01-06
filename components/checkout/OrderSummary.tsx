"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";

interface OrderSummaryProps {
  prompt: {
    id: string;
    title: string;
    title_en?: string;
    thumbnail_url: string;
    ai_model: string;
    price: number;
  };
}

export function OrderSummary({ prompt }: OrderSummaryProps) {
  const t = useTranslations("checkout");
  const displayTitle = prompt.title_en || prompt.title;
  const priceDisplay = formatPrice(prompt.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 mb-8 space-y-6"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t("orderSummary")}
      </h2>
      
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
          <Image
            src={prompt.thumbnail_url || "/placeholder-thumbnail.png"}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {displayTitle}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            AI Model: {prompt.ai_model}
          </p>
        </div>
        
        <span className="text-lg font-bold text-[#00A86B] flex-shrink-0">
          {priceDisplay}
        </span>
      </div>
      
      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="flex justify-between text-white font-semibold text-xl">
          <span>{t("total")}</span>
          <span className="text-[#00A86B]">{priceDisplay}</span>
        </div>
        <p className="text-sm text-gray-400 mt-2 text-center">
          {t("noHiddenFees")}
        </p>
      </div>
    </motion.div>
  );
}


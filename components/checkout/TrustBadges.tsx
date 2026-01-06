"use client";

import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function TrustBadges() {
  const t = useTranslations("checkout");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 text-center space-y-4"
    >
      <div className="flex justify-center gap-6 md:gap-8 flex-wrap">
        <div className="flex flex-col items-center text-gray-400 text-sm">
          <Shield size={24} className="text-[#00A86B] mb-2" />
          <span className="text-xs md:text-sm">
            {t("secureTransaction")}
          </span>
        </div>
        
        <div className="flex flex-col items-center text-gray-400 text-sm">
          <Lock size={24} className="text-[#00A86B] mb-2" />
          <span className="text-xs md:text-sm">
            {t("refundPolicy")}
          </span>
        </div>
        
        <div className="flex flex-col items-center text-gray-400 text-sm">
          <CheckCircle2 size={24} className="text-[#00A86B] mb-2" />
          <span className="text-xs md:text-sm">
            {t("instantAccess")}
          </span>
        </div>
      </div>
      
      <p className="text-gray-500 text-xs mt-4">
        {t("securePaymentDescription")}
      </p>
    </motion.div>
  );
}


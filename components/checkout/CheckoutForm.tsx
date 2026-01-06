"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface CheckoutFormProps {
  promptId: string;
  price: number;
}

export function CheckoutForm({ promptId, price }: CheckoutFormProps) {
  const t = useTranslations("checkout");
  const params = useParams();
  const locale = params.locale as string;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceDisplay = formatPrice(price);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Lemon Squeezy 결제 연동
      // 실제 구현 시 Lemon Squeezy API를 호출하여 결제 세션 생성
      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId,
          price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment session");
      }

      const data = await response.json();
      
      // Lemon Squeezy 체크아웃 URL로 리다이렉트
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("failed")
      );
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 space-y-6 sticky top-8"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t("paymentInformation")}
      </h2>

      {/* 환불 정책 안내 */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#00A86B]" />
          {t("refundPolicy")}
        </h3>
        <p className="text-xs text-gray-400">
          {t("refundPolicyDescription")}
        </p>
        <Link
          href={`/${locale}/refund-policy`}
          className="text-xs text-[#00A86B] hover:underline inline-block mt-2"
        >
          {t("viewFullPolicy")}
        </Link>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      )}

      {/* 최종 가격 */}
      <div className="flex justify-between items-center text-white pt-4 border-t border-gray-800">
        <span className="text-xl md:text-2xl font-bold">
          {t("finalPrice")}
        </span>
        <span className="text-xl md:text-2xl font-bold text-[#00A86B]">
          {priceDisplay}
        </span>
      </div>

      <p className="text-sm text-gray-400 text-center">
        {t("noHiddenFees")}
      </p>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full px-8 py-4 bg-[#00A86B] text-white rounded-[32px] font-semibold text-lg hover:bg-[#008a5a] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl shadow-[#00A86B]/30 flex items-center justify-center gap-2 min-h-[44px]"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{t("processing")}</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={20} />
            <span>{t("completePurchase")}</span>
          </>
        )}
      </button>

      {/* 보안 안내 */}
      <p className="text-xs text-gray-500 text-center">
        {t("securePaymentPowered")}
      </p>
    </motion.div>
  );
}


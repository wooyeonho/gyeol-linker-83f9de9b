'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Shield, Clock } from 'lucide-react';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: {
    title: string;
    price: number;
    ai_model?: string;
    seller_name?: string;
  };
}

/**
 * Premium Purchase Modal Component
 * Stitch Design System compliant
 * 
 * Features:
 * - Backdrop blur overlay
 * - Price breakdown with commission calculation
 * - "Coming soon" payment message
 * - Smooth animations
 */
export default function PurchaseModal({ isOpen, onClose, prompt }: PurchaseModalProps) {
  // Calculate earnings (80% to seller, 20% platform)
  const SELLER_RATE = 0.80;
  const sellerEarnings = prompt.price * SELLER_RATE;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Format price to USD
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-8 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Complete Purchase</h2>
                <p className="text-gray-400 text-sm line-clamp-2">{prompt.title}</p>
                {prompt.ai_model && (
                  <span className="inline-block mt-2 px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                    {prompt.ai_model.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-[#1A1A1A] rounded-[24px] p-6 mb-6">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-gray-400">Total Price</span>
                  <span className="text-4xl font-bold text-primary">
                    {formatPrice(prompt.price)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Seller receives (80%)</span>
                    <span className="text-gray-300">{formatPrice(sellerEarnings)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Platform fee (20%)</span>
                    <span className="text-gray-300">{formatPrice(prompt.price - sellerEarnings)}</span>
                  </div>
                </div>
              </div>

              {/* Coming Soon Message */}
              <div className="bg-primary/10 border border-primary/30 rounded-[24px] p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-primary font-medium mb-1">
                      Global Payment System Launching Soon
                    </p>
                    <p className="text-xs text-gray-400">
                      We&apos;re integrating secure payment processing. You&apos;ll be notified when purchases are available.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 mb-6 text-gray-500 text-xs">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Instant Delivery</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full bg-primary/50 text-white/70 font-semibold py-4 rounded-[32px] cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Purchase Now
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 rounded-[32px] transition-all"
                >
                  Close
                </button>
              </div>

              {/* Footer Note */}
              {prompt.seller_name && (
                <p className="mt-4 text-center text-xs text-gray-500">
                  Sold by {prompt.seller_name}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

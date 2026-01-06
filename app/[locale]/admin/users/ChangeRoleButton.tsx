'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { changeUserRole } from '@/app/actions/admin';
import { useToast } from '@/components/ui/Toast';
import { ChevronDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 역할 변경 버튼 컴포넌트
 */
export default function ChangeRoleButton({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: 'user' | 'seller' | 'admin';
}) {
  const t = useTranslations('adminUsers');
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const roles: Array<{ value: 'user' | 'seller' | 'admin'; label: string }> = [
    { value: 'user', label: t('user') },
    { value: 'seller', label: t('seller') },
    { value: 'admin', label: t('admin') },
  ];

  const handleRoleChange = async (newRole: 'user' | 'seller' | 'admin') => {
    if (newRole === currentRole || isProcessing) {
      setIsOpen(false);
      return;
    }

    setIsProcessing(true);

    try {
      const result = await changeUserRole(userId, newRole);

      if (result.error) {
        addToast({ type: 'error', message: result.error });
        setIsProcessing(false);
        return;
      }

      addToast({ type: 'success', message: t('success') });
      setIsOpen(false);
      window.location.reload(); // 페이지 새로고침하여 변경사항 반영
    } catch (error) {
      console.error('역할 변경 오류:', error);
      addToast({ type: 'error', message: t('failed') });
      setIsProcessing(false);
    }
  };

  const currentRoleLabel = roles.find((r) => r.value === currentRole)?.label || currentRole;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isProcessing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-[32px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t('changeRole')}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>{currentRoleLabel}</span>
            <ChevronDown className="w-4 h-4" />
          </>
        )}
      </motion.button>

      {isOpen && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-800 rounded-[24px] shadow-xl z-50"
        >
          <div className="py-2">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleChange(role.value)}
                disabled={role.value === currentRole}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  role.value === currentRole
                    ? 'bg-primary/20 text-primary cursor-not-allowed'
                    : 'text-white hover:bg-gray-800'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}




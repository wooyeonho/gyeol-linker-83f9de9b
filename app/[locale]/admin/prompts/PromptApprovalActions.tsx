'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { approvePrompt, rejectPrompt } from '@/app/actions/prompts-admin';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

/**
 * 프롬프트 승인/반려 액션 버튼 컴포넌트
 */
export default function PromptApprovalActions({ promptId }: { promptId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isApproving, startApproving] = useTransition();
  const [isRejecting, startRejecting] = useTransition();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = () => {
    if (!confirm('이 프롬프트를 승인하시겠습니까?')) {
      return;
    }

    startApproving(async () => {
      const result = await approvePrompt(promptId);
      if (result.error) {
        addToast({ type: 'error', message: result.error });
      } else {
        addToast({ type: 'success', message: '프롬프트가 승인되었습니다.' });
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      addToast({ type: 'warning', message: '반려 사유를 입력해주세요.' });
      return;
    }

    if (!confirm('이 프롬프트를 반려하시겠습니까?')) {
      return;
    }

    startRejecting(async () => {
      const result = await rejectPrompt(promptId, rejectReason);
      if (result.error) {
        addToast({ type: 'error', message: result.error });
      } else {
        addToast({ type: 'info', message: '프롬프트가 반려되었습니다.' });
        setShowRejectForm(false);
        setRejectReason('');
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {showRejectForm ? (
          <motion.div
            key="reject-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isRejecting}
              aria-label="반려 사유 입력"
            />
            <motion.button
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>반려</span>
            </motion.button>
            <motion.button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              disabled={isRejecting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="action-buttons"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-3"
          >
            <motion.button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>승인</span>
            </motion.button>
            <motion.button
              onClick={() => setShowRejectForm(true)}
              disabled={isApproving || isRejecting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              <span>반려</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


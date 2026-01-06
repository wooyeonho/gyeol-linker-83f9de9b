'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { approvePrompt, requestEditPrompt, rejectPrompt } from '@/app/actions/prompts-admin';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from 'next-intl';

interface PromptReviewActionsProps {
  promptId: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * 프롬프트 리뷰 액션 버튼 컴포넌트
 * 승인, 수정 요청, 반려 기능 제공
 */
export default function PromptReviewActions({
  promptId,
  status,
}: PromptReviewActionsProps) {
  const t = useTranslations('admin.review');
  const router = useRouter();
  const { addToast } = useToast();
  const [isApproving, startApproving] = useTransition();
  const [isRequestingEdit, startRequestingEdit] = useTransition();
  const [isRejecting, startRejecting] = useTransition();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = () => {
    if (!confirm(t('confirm.approve'))) {
      return;
    }

    startApproving(async () => {
      const result = await approvePrompt(promptId);
      if (result.error) {
        addToast({ type: 'error', message: result.error });
      } else {
        addToast({ type: 'success', message: t('success.approve') });
        router.refresh();
      }
    });
  };

  const handleRequestEdit = () => {
    if (!editReason.trim()) {
      addToast({ type: 'warning', message: t('warning.editReasonRequired') });
      return;
    }

    startRequestingEdit(async () => {
      const result = await requestEditPrompt(promptId, editReason);
      if (result.error) {
        addToast({ type: 'error', message: result.error });
      } else {
        addToast({ type: 'success', message: t('success.requestEdit') });
        setShowEditModal(false);
        setEditReason('');
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      addToast({ type: 'warning', message: t('warning.rejectReasonRequired') });
      return;
    }

    if (!confirm(t('confirm.reject'))) {
      return;
    }

    startRejecting(async () => {
      const result = await rejectPrompt(promptId, rejectReason);
      if (result.error) {
        addToast({ type: 'error', message: result.error });
      } else {
        addToast({ type: 'info', message: t('success.reject') });
        setShowRejectModal(false);
        setRejectReason('');
        router.refresh();
      }
    });
  };

  // pending 상태가 아니면 액션 버튼 숨김
  if (status !== 'pending') {
    return null;
  }

  return (
    <>
      {/* 액션 버튼들 */}
      <div className="flex flex-col md:flex-row gap-4 justify-end">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRequestingEdit || isRejecting}
          className="px-6 py-3 bg-primary text-white rounded-[32px] font-semibold hover:bg-primary-600 transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>{t('actions.approving')}</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>{t('actions.approve')}</span>
            </>
          )}
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          disabled={isApproving || isRequestingEdit || isRejecting}
          className="px-6 py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>✏️</span>
          <span>{t('actions.requestEdit')}</span>
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isApproving || isRequestingEdit || isRejecting}
          className="px-6 py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 border border-gray-700 transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>✗</span>
          <span>{t('actions.reject')}</span>
        </button>
      </div>

      {/* 수정 요청 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 max-w-md w-full space-y-4">
            <h3 className="text-xl font-semibold">{t('modal.editTitle')}</h3>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={t('modal.editPlaceholder')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-none"
              disabled={isRequestingEdit}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRequestEdit}
                disabled={isRequestingEdit || !editReason.trim()}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-[32px] font-semibold hover:bg-primary-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequestingEdit ? t('actions.submitting') : t('actions.submit')}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditReason('');
                }}
                disabled={isRequestingEdit}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 반려 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 max-w-md w-full space-y-4">
            <h3 className="text-xl font-semibold">{t('modal.rejectTitle')}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('modal.rejectPlaceholder')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent min-h-[120px] resize-none"
              disabled={isRejecting}
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 border border-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? t('actions.submitting') : t('actions.reject')}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={isRejecting}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-[32px] font-semibold hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


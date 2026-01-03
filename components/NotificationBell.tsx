'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/app/actions/notifications';

/**
 * 실시간 알림 벨 컴포넌트
 */
export default function NotificationBell() {
  const router = useRouter();
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 초기 알림 로드
  useEffect(() => {
    loadNotifications();
  }, []);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient();
    
    // 현재 사용자 ID 가져오기
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Realtime 채널 구독
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // 새 알림 수신
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // 알림 업데이트 (읽음 처리 등)
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
            if (updatedNotification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 알림 로드
  const loadNotifications = async () => {
    setLoading(true);
    const result = await getNotifications(20);
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
    setLoading(false);
  };

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // 링크로 이동
    if (notification.link_url) {
      router.push(notification.link_url);
      setIsOpen(false);
    }
  };

  // 모두 읽음 처리
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label={t('title')}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-[32px] shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">{t('title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary hover:text-primary-600 transition-colors"
              >
                {t('markAllAsRead')}
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <p>로딩 중...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>{t('noNotifications')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-gray-800 transition-colors ${
                      !notification.is_read ? 'bg-gray-800/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium mb-1 ${
                            !notification.is_read ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


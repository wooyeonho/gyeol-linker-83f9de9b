'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * 알림 타입
 */
export type NotificationType = 'review' | 'payout' | 'prompt_status' | 'prompt_approved' | 'prompt_rejected';

/**
 * 알림 데이터 타입
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * 알림 생성 (시스템 내부 호출용)
 */
export async function createNotification({
  userId,
  type,
  title,
  content,
  linkUrl,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  linkUrl?: string;
}) {
  const supabase = await createClient();

  // RPC 함수 호출
  const { data: notificationId, error } = await supabase.rpc(
    'create_notification',
    {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_content: content,
      p_link_url: linkUrl || null,
    }
  );

  if (error) {
    console.error('알림 생성 오류:', error);
    return { error: '알림 생성에 실패했습니다.' };
  }

  return { success: true, notificationId };
}

/**
 * 사용자의 최신 알림 조회
 */
export async function getNotifications(limit: number = 20): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  // 2. 읽지 않은 알림 개수 조회
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  // 3. 최신 알림 조회 (읽지 않은 것 우선, 최신순)
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('is_read', { ascending: true }) // 읽지 않은 것 먼저
    .order('created_at', { ascending: false }) // 최신순
    .limit(limit);

  if (error) {
    console.error('알림 조회 오류:', error);
    return { notifications: [], unreadCount: 0 };
  }

  return {
    notifications:
      notifications?.map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        content: n.content,
        link_url: n.link_url,
        is_read: n.is_read,
        created_at: n.created_at,
      })) || [],
    unreadCount: unreadCount || 0,
  };
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(notificationId: string) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 알림 소유권 확인 및 읽음 처리
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id); // 본인 알림만 수정 가능

  if (error) {
    console.error('알림 읽음 처리 오류:', error);
    return { error: '알림 읽음 처리에 실패했습니다.' };
  }

  return { success: true };
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllAsRead() {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 모든 읽지 않은 알림 읽음 처리
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('전체 알림 읽음 처리 오류:', error);
    return { error: '알림 읽음 처리에 실패했습니다.' };
  }

  return { success: true };
}



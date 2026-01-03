-- ============================================
-- 알림 시스템
-- notifications 테이블 및 트리거 생성
-- ============================================

-- ============================================
-- 1. Enum 타입 생성
-- ============================================

-- 알림 타입
CREATE TYPE notification_type AS ENUM ('review', 'payout', 'prompt_status');

-- ============================================
-- 2. notifications 테이블 생성
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
-- 읽은 지 30일이 지난 알림 식별용 인덱스
CREATE INDEX idx_notifications_old_read ON notifications(created_at) 
WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 알림만 조회 가능
CREATE POLICY "사용자는 본인 알림 조회 가능"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- RLS 정책: 본인 알림만 수정 가능 (읽음 처리)
CREATE POLICY "사용자는 본인 알림 수정 가능"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS 정책: 시스템은 알림 생성 가능 (서버 사이드에서만)
-- 실제로는 RPC 함수를 통해 생성하므로 INSERT 정책은 필요 없음
-- 하지만 필요시 SECURITY DEFINER 함수에서 생성

-- ============================================
-- 3. 알림 생성 함수 (서버 사이드에서 호출)
-- ============================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_content TEXT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, content, link_url)
  VALUES (p_user_id, p_type, p_title, p_content, p_link_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 프롬프트 상태 변경 시 알림 트리거
-- ============================================

CREATE OR REPLACE FUNCTION create_prompt_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_content TEXT;
  v_link_url TEXT;
  v_locale TEXT := 'ko'; -- 기본값, 실제로는 다국어 처리 필요
BEGIN
  -- 상태가 변경된 경우에만 알림 생성
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- 프롬프트 정보 조회
    SELECT 
      CASE 
        WHEN NEW.status = 'approved' THEN '프롬프트가 승인되었습니다'
        WHEN NEW.status = 'rejected' THEN '프롬프트가 거부되었습니다'
        ELSE NULL
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 
          COALESCE(NEW.title_ko, NEW.title_en) || ' 프롬프트가 승인되어 판매를 시작할 수 있습니다.'
        WHEN NEW.status = 'rejected' THEN 
          COALESCE(NEW.title_ko, NEW.title_en) || ' 프롬프트가 거부되었습니다.'
        ELSE NULL
      END,
      '/seller/prompts'
    INTO v_title, v_content, v_link_url;
    
    -- 알림 생성 (승인/거부 시에만)
    IF v_title IS NOT NULL THEN
      PERFORM create_notification(
        NEW.seller_id,
        'prompt_status',
        v_title,
        v_content,
        v_link_url
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER prompts_status_change_notification
AFTER UPDATE OF status ON prompts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_prompt_status_notification();

-- ============================================
-- 5. Realtime 활성화 (수동 설정 필요)
-- ============================================

-- Supabase Dashboard에서 다음 설정 필요:
-- 1. Database > Replication 메뉴로 이동
-- 2. notifications 테이블의 Realtime 활성화
-- 또는 아래 SQL 실행:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- 완료
-- ============================================



-- ============================================
-- 출금 관리 시스템
-- payouts 테이블 및 RPC 함수 생성
-- ============================================

-- ============================================
-- 1. Enum 타입 생성
-- ============================================

-- 출금 상태
CREATE TYPE payout_status AS ENUM ('pending', 'completed');

-- ============================================
-- 2. payouts 테이블 생성
-- ============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status payout_status NOT NULL DEFAULT 'pending',
  payout_method TEXT NOT NULL, -- 입금받을 계좌 정보 또는 페이팔 이메일
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_payouts_seller_id ON payouts(seller_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_requested_at ON payouts(requested_at DESC);

-- RLS 활성화
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 판매자는 본인 출금 내역만 조회 가능
CREATE POLICY "판매자는 본인 출금 내역 조회 가능"
ON payouts FOR SELECT
USING (seller_id = auth.uid());

-- RLS 정책: 판매자는 출금 신청 가능
CREATE POLICY "판매자는 출금 신청 가능"
ON payouts FOR INSERT
WITH CHECK (
  seller_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('seller', 'admin')
  )
);

-- RLS 정책: 관리자는 모든 출금 내역 조회 가능
CREATE POLICY "관리자는 모든 출금 내역 조회 가능"
ON payouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 3. RPC 함수: 출금 신청 (트랜잭션 처리)
-- ============================================

CREATE OR REPLACE FUNCTION request_payout(
  p_seller_id UUID,
  p_amount NUMERIC(10, 2),
  p_payout_method TEXT
)
RETURNS UUID AS $$
DECLARE
  v_current_balance NUMERIC(10, 2);
  v_payout_id UUID;
  v_minimum_amount NUMERIC(10, 2) := 10.00;
BEGIN
  -- 1. 최소 출금 금액 확인
  IF p_amount < v_minimum_amount THEN
    RAISE EXCEPTION '최소 출금 금액은 $10입니다.';
  END IF;

  -- 2. 현재 잔액 조회 및 잔액 부족 확인
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_seller_id
  FOR UPDATE; -- 행 잠금 (동시성 제어)

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION '판매자를 찾을 수 없습니다.';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION '잔액이 부족합니다. 현재 잔액: $%', v_current_balance;
  END IF;

  -- 3. 잔액 차감
  UPDATE profiles
  SET balance = balance - p_amount
  WHERE id = p_seller_id
  AND balance >= p_amount; -- 안전장치

  -- 4. 잔액 차감 성공 여부 확인
  IF NOT FOUND THEN
    RAISE EXCEPTION '잔액 차감에 실패했습니다.';
  END IF;

  -- 5. 출금 기록 생성
  INSERT INTO payouts (seller_id, amount, payout_method, status)
  VALUES (p_seller_id, p_amount, p_payout_method, 'pending')
  RETURNING id INTO v_payout_id;

  -- 6. 출금 ID 반환
  RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료
-- ============================================



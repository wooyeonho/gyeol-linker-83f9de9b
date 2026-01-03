-- ============================================
-- 프롬프트 정음 데이터베이스 스키마
-- ============================================

-- ============================================
-- 1. Enum 타입 생성
-- ============================================

-- 사용자 역할
CREATE TYPE user_role AS ENUM ('user', 'seller', 'admin');

-- 프롬프트 상태
CREATE TYPE prompt_status AS ENUM ('pending', 'approved', 'rejected');

-- 주문 상태
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'refunded');

-- ============================================
-- 2. profiles 테이블 (사용자)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 정보 조회 가능
CREATE POLICY "사용자는 본인 프로필 조회 가능"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- RLS 정책: 본인 정보 수정 가능
CREATE POLICY "사용자는 본인 프로필 수정 가능"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- RLS 정책: 모든 사용자 프로필 생성 가능 (회원가입 시)
CREATE POLICY "모든 사용자 프로필 생성 가능"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. prompts 테이블 (프롬프트 상품)
-- ============================================

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  
  -- 다국어 필드
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  description_en TEXT NOT NULL,
  instructions_ko TEXT,
  instructions_en TEXT,
  
  -- 프롬프트 정보
  content TEXT NOT NULL, -- 프롬프트 원문 (구매자만 접근)
  ai_model TEXT NOT NULL, -- 'GPT-4', 'Claude', 'Midjourney' 등
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0.99),
  category_ko TEXT NOT NULL,
  category_en TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}', -- 검색용 태그 배열
  
  -- 미디어
  thumbnail_url TEXT NOT NULL,
  result_images TEXT[] DEFAULT '{}', -- Before/After 이미지 배열
  result_video_url TEXT,
  
  -- 상태 관리
  status prompt_status NOT NULL DEFAULT 'pending',
  view_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete
);

-- 인덱스
CREATE UNIQUE INDEX idx_prompts_slug ON prompts(slug);
CREATE INDEX idx_prompts_seller_id ON prompts(seller_id);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_category_ko ON prompts(category_ko);
CREATE INDEX idx_prompts_category_en ON prompts(category_en);
CREATE INDEX idx_prompts_deleted_at ON prompts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags); -- 배열 검색 최적화
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);

-- RLS 활성화
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 승인된 프롬프트는 모든 사용자 조회 가능 (단, content 제외)
CREATE POLICY "승인된 프롬프트 공개 조회"
ON prompts FOR SELECT
USING (
  status = 'approved' 
  AND deleted_at IS NULL
);

-- RLS 정책: 판매자는 본인 프롬프트 조회 가능
CREATE POLICY "판매자는 본인 프롬프트 조회 가능"
ON prompts FOR SELECT
USING (
  seller_id = auth.uid()
  AND deleted_at IS NULL
);

-- RLS 정책: 구매자는 구매한 프롬프트의 content 조회 가능
CREATE POLICY "구매자는 구매한 프롬프트 content 조회 가능"
ON prompts FOR SELECT
USING (
  auth.uid() IN (
    SELECT buyer_id 
    FROM orders 
    WHERE prompt_id = prompts.id 
    AND status = 'completed'
  )
);

-- RLS 정책: 판매자는 본인 프롬프트 생성 가능
CREATE POLICY "판매자는 프롬프트 생성 가능"
ON prompts FOR INSERT
WITH CHECK (
  seller_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('seller', 'admin')
  )
);

-- RLS 정책: 판매자는 본인 프롬프트 수정 가능
CREATE POLICY "판매자는 본인 프롬프트 수정 가능"
ON prompts FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- RLS 정책: 관리자는 모든 프롬프트 조회/수정 가능
CREATE POLICY "관리자는 모든 프롬프트 접근 가능"
ON prompts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 4. orders 테이블 (주문)
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  commission NUMERIC(10, 2) NOT NULL CHECK (commission >= 0), -- 플랫폼 수수료 (amount * 0.20)
  seller_revenue NUMERIC(10, 2) NOT NULL CHECK (seller_revenue >= 0), -- 판매자 수익 (amount * 0.80)
  status order_status NOT NULL DEFAULT 'pending',
  lemon_squeezy_order_id TEXT UNIQUE, -- 외부 결제 시스템 ID
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_prompt_id ON orders(prompt_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_lemon_squeezy_order_id ON orders(lemon_squeezy_order_id);

-- RLS 활성화
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 구매자는 본인 주문 조회 가능
CREATE POLICY "구매자는 본인 주문 조회 가능"
ON orders FOR SELECT
USING (buyer_id = auth.uid());

-- RLS 정책: 판매자는 본인 프롬프트 주문 조회 가능
CREATE POLICY "판매자는 본인 프롬프트 주문 조회 가능"
ON orders FOR SELECT
USING (
  prompt_id IN (
    SELECT id FROM prompts WHERE seller_id = auth.uid()
  )
);

-- RLS 정책: 구매자는 주문 생성 가능
CREATE POLICY "구매자는 주문 생성 가능"
ON orders FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- RLS 정책: 관리자는 모든 주문 조회 가능
CREATE POLICY "관리자는 모든 주문 조회 가능"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 5. reviews 테이블 (리뷰)
-- ============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 같은 주문으로 중복 리뷰 방지
  UNIQUE(order_id)
);

-- 인덱스
CREATE INDEX idx_reviews_prompt_id ON reviews(prompt_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- RLS 활성화
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자는 리뷰 조회 가능
CREATE POLICY "모든 사용자는 리뷰 조회 가능"
ON reviews FOR SELECT
USING (true);

-- RLS 정책: 구매자는 본인 주문에 대한 리뷰만 작성 가능
CREATE POLICY "구매자는 본인 주문 리뷰 작성 가능"
ON reviews FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND order_id IN (
    SELECT id FROM orders 
    WHERE buyer_id = auth.uid() 
    AND status = 'completed'
  )
);

-- RLS 정책: 작성자는 본인 리뷰 수정/삭제 가능
CREATE POLICY "작성자는 본인 리뷰 수정/삭제 가능"
ON reviews FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "작성자는 본인 리뷰 삭제 가능"
ON reviews FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- 6. Trigger 함수: updated_at 자동 갱신
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- prompts 테이블에 Trigger 적용
CREATE TRIGGER prompts_updated_at
BEFORE UPDATE ON prompts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 7. Trigger 함수: Auth 사용자 자동 프로필 생성
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성 시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 8. 함수: 주문 완료 시 판매자 수익 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION update_seller_balance_on_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- 주문 상태가 'completed'로 변경될 때
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- 판매자 잔액 증가
    UPDATE profiles
    SET balance = balance + NEW.seller_revenue
    WHERE id = (
      SELECT seller_id FROM prompts WHERE id = NEW.prompt_id
    );
  END IF;
  
  -- 환불 시 판매자 잔액 차감
  IF NEW.status = 'refunded' AND OLD.status = 'completed' THEN
    UPDATE profiles
    SET balance = balance - NEW.seller_revenue
    WHERE id = (
      SELECT seller_id FROM prompts WHERE id = NEW.prompt_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- orders 테이블에 Trigger 적용
CREATE TRIGGER orders_update_seller_balance
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_seller_balance_on_order_complete();

-- ============================================
-- 9. 함수: 프롬프트 조회수 증가
-- ============================================

CREATE OR REPLACE FUNCTION increment_prompt_view_count(prompt_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE prompts
  SET view_count = view_count + 1
  WHERE id = prompt_uuid
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. 함수: 프롬프트 구매수 증가
-- ============================================

CREATE OR REPLACE FUNCTION increment_prompt_purchase_count(prompt_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE prompts
  SET purchase_count = purchase_count + 1
  WHERE id = prompt_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주문 완료 시 구매수 자동 증가
CREATE OR REPLACE FUNCTION handle_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM increment_prompt_purchase_count(NEW.prompt_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_increment_purchase_count
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_order_complete();

-- ============================================
-- 완료
-- ============================================



-- 연차 정책 테이블
CREATE TABLE IF NOT EXISTS annual_leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  
  -- 1단계: 입사 첫 해 정책
  first_year_monthly_grant INTEGER DEFAULT 1,
  first_year_max_days INTEGER DEFAULT 11,
  
  -- 2단계: 입사 1년 이후 정책  
  base_annual_days INTEGER DEFAULT 15,
  increment_years INTEGER DEFAULT 2,
  increment_days INTEGER DEFAULT 1,
  max_annual_days INTEGER DEFAULT 25,
  
  -- 소멸 정책
  expire_after_months INTEGER DEFAULT 12,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 연차 거래 내역 테이블
CREATE TABLE IF NOT EXISTS annual_leave_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(100) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('grant', 'use', 'expire', 'adjust')),
  amount DECIMAL(4,1) NOT NULL, -- 양수: 부여/복구, 음수: 사용/차감
  reason TEXT NOT NULL,
  grant_date DATE, -- 부여일 (소멸 계산용)
  expire_date DATE, -- 소멸 예정일  
  reference_id UUID, -- 휴가 신청 ID 등 참조
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 연차 잔액 요약 테이블
CREATE TABLE IF NOT EXISTS annual_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(100) NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  join_date DATE NOT NULL,
  total_granted DECIMAL(4,1) DEFAULT 0, -- 총 부여된 연차
  total_used DECIMAL(4,1) DEFAULT 0, -- 총 사용된 연차
  total_expired DECIMAL(4,1) DEFAULT 0, -- 총 소멸된 연차
  current_balance DECIMAL(4,1) DEFAULT 0, -- 현재 잔여 연차
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_member_id ON annual_leave_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_type ON annual_leave_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_reference_id ON annual_leave_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_annual_leave_balances_member_id ON annual_leave_balances(member_id);

-- 기본 연차 정책 삽입
INSERT INTO annual_leave_policies (
  policy_name, 
  description, 
  is_active,
  first_year_monthly_grant,
  first_year_max_days,
  base_annual_days,
  increment_years,
  increment_days,
  max_annual_days,
  expire_after_months
) VALUES (
  '기본 연차 정책',
  '한국 표준 연차 정책 - 첫 해 월별 1일씩 부여, 1년 후 15일 기본 + 2년마다 1일 증가 (최대 25일)',
  true,
  1, -- 첫 해 월별 1일
  11, -- 첫 해 최대 11일
  15, -- 기본 연차 15일
  2, -- 2년마다 증가
  1, -- 1일씩 증가
  25, -- 최대 25일
  12 -- 12개월 후 소멸
) ON CONFLICT DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE annual_leave_policies IS '연차 정책 설정';
COMMENT ON TABLE annual_leave_transactions IS '연차 거래 내역 (부여/사용/소멸/조정)';
COMMENT ON TABLE annual_leave_balances IS '구성원별 연차 잔액 요약';

COMMENT ON COLUMN annual_leave_transactions.transaction_type IS '거래 유형: grant(부여), use(사용), expire(소멸), adjust(조정)';
COMMENT ON COLUMN annual_leave_transactions.amount IS '거래량: 양수(부여/복구), 음수(사용/차감)';
COMMENT ON COLUMN annual_leave_transactions.reference_id IS '참조 ID (휴가 신청 등)';
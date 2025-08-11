-- 트랜잭션 상태 관리를 위한 스키마 변경

-- 1. status 컬럼 추가 (active: 활성, cancelled: 취소됨)
ALTER TABLE annual_leave_transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'cancelled'));

-- 2. cancelled_at, cancelled_by 컬럼 추가
ALTER TABLE annual_leave_transactions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255);

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_status 
ON annual_leave_transactions(member_id, status);

CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_reference 
ON annual_leave_transactions(reference_id, status);

-- 4. 기존 데이터 마이그레이션
-- use_cancel 타입을 찾아서 원본 use를 cancelled로 변경
UPDATE annual_leave_transactions t1
SET 
  status = 'cancelled',
  cancelled_at = t2.created_at,
  cancelled_by = t2.created_by
FROM annual_leave_transactions t2
WHERE 
  t1.transaction_type = 'use'
  AND t1.amount < 0
  AND t2.transaction_type = 'use_cancel'
  AND t2.reference_id = t1.reference_id
  AND t1.member_id = t2.member_id
  AND ABS(t1.amount) = t2.amount;

-- grant_cancel 타입을 찾아서 원본 grant를 cancelled로 변경  
UPDATE annual_leave_transactions t1
SET 
  status = 'cancelled',
  cancelled_at = t2.created_at,
  cancelled_by = t2.created_by
FROM annual_leave_transactions t2
WHERE 
  t1.transaction_type IN ('grant', 'manual_grant')
  AND t2.transaction_type = 'grant_cancel'
  AND t2.reference_id = t1.id;

-- 5. use_cancel과 grant_cancel 트랜잭션 자체도 cancelled로 표시
UPDATE annual_leave_transactions
SET status = 'cancelled'
WHERE transaction_type IN ('use_cancel', 'grant_cancel');

-- 6. 확인
SELECT 
  transaction_type,
  status,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as active_amount
FROM annual_leave_transactions
GROUP BY transaction_type, status
ORDER BY transaction_type, status;
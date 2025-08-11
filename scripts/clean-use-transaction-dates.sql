-- use 트랜잭션에서 불필요한 grant_date와 expire_date 제거
-- reference_id로 부여 정보를 추적할 수 있으므로 중복 저장 불필요

-- 1. 기존 use 트랜잭션의 grant_date와 expire_date를 NULL로 업데이트
UPDATE annual_leave_transactions
SET 
  grant_date = NULL,
  expire_date = NULL
WHERE transaction_type = 'use';

-- 2. 확인 쿼리
SELECT 
  id,
  member_name,
  transaction_type,
  amount,
  reason,
  grant_date,
  expire_date,
  reference_id,
  status
FROM annual_leave_transactions
WHERE transaction_type = 'use'
ORDER BY created_at DESC
LIMIT 10;

-- 3. use 트랜잭션과 관련 부여 정보를 조인해서 보는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW v_leave_usage_details AS
SELECT 
  u.id,
  u.member_id,
  u.member_name,
  u.transaction_type,
  u.amount,
  u.reason,
  u.reference_id,
  u.created_at,
  u.created_by,
  u.status,
  u.cancelled_at,
  u.cancelled_by,
  -- 부여 정보는 JOIN으로 가져오기
  g.grant_date AS original_grant_date,
  g.expire_date AS original_expire_date
FROM annual_leave_transactions u
LEFT JOIN annual_leave_transactions g ON u.reference_id = g.id
WHERE u.transaction_type = 'use';

-- 사용 예시
-- SELECT * FROM v_leave_usage_details WHERE member_id = '특정ID';
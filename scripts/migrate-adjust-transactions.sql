-- 기존 adjust 타입 거래를 manual_grant/grant_cancel로 마이그레이션
-- adjust 타입은 이제 특수한 보정용으로만 사용

-- 0. 먼저 체크 제약조건 업데이트 (새로운 거래 유형 허용)
ALTER TABLE annual_leave_transactions 
DROP CONSTRAINT IF EXISTS annual_leave_transactions_transaction_type_check;

ALTER TABLE annual_leave_transactions 
ADD CONSTRAINT annual_leave_transactions_transaction_type_check 
CHECK (transaction_type IN ('grant', 'manual_grant', 'grant_cancel', 'use', 'expire', 'adjust'));

-- 양수 adjust를 manual_grant로 변경 (관리자 수동 부여)
UPDATE annual_leave_transactions
SET 
  transaction_type = 'manual_grant',
  grant_date = DATE(created_at),
  expire_date = DATE(created_at + INTERVAL '365 days'),
  reason = CASE 
    WHEN reason IS NULL OR reason = '' THEN '관리자 수동 부여'
    ELSE reason || ' (관리자 수동 부여)'
  END
WHERE 
  transaction_type = 'adjust' 
  AND amount > 0
  AND grant_date IS NULL;

-- 음수 adjust를 grant_cancel로 변경 (부여 취소)
UPDATE annual_leave_transactions
SET 
  transaction_type = 'grant_cancel',
  grant_date = DATE(created_at),
  reason = CASE 
    WHEN reason IS NULL OR reason = '' THEN '관리자 부여 취소'
    ELSE reason || ' (부여 취소)'
  END
WHERE 
  transaction_type = 'adjust' 
  AND amount < 0
  AND grant_date IS NULL;

-- 확인
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM annual_leave_transactions
GROUP BY transaction_type
ORDER BY transaction_type;
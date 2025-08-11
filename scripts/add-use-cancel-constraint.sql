-- 1. 기존 체크 제약조건 삭제
ALTER TABLE annual_leave_transactions 
DROP CONSTRAINT IF EXISTS annual_leave_transactions_transaction_type_check;

-- 2. 새로운 거래 유형을 포함한 체크 제약조건 추가 (use_cancel 추가)
ALTER TABLE annual_leave_transactions 
ADD CONSTRAINT annual_leave_transactions_transaction_type_check 
CHECK (transaction_type IN ('grant', 'manual_grant', 'grant_cancel', 'use', 'use_cancel', 'expire', 'adjust'));

-- 3. 기존 use 타입 중 양수인 것들을 use_cancel로 변경
UPDATE annual_leave_transactions
SET transaction_type = 'use_cancel'
WHERE transaction_type = 'use' 
  AND amount > 0;

-- 4. 확인
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as positive_sum,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as negative_sum
FROM annual_leave_transactions
GROUP BY transaction_type
ORDER BY transaction_type;
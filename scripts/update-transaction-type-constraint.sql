-- 1. 먼저 기존 체크 제약조건 삭제
ALTER TABLE annual_leave_transactions 
DROP CONSTRAINT IF EXISTS annual_leave_transactions_transaction_type_check;

-- 2. 새로운 거래 유형을 포함한 체크 제약조건 추가
ALTER TABLE annual_leave_transactions 
ADD CONSTRAINT annual_leave_transactions_transaction_type_check 
CHECK (transaction_type IN ('grant', 'manual_grant', 'grant_cancel', 'use', 'expire', 'adjust'));

-- 3. 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'annual_leave_transactions_transaction_type_check';
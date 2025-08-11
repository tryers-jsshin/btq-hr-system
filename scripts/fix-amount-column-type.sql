-- annual_leave_transactions 테이블의 amount 컬럼을 DECIMAL로 변경
-- 반차(0.5일) 지원을 위해 필요

-- 1. amount 컬럼을 DECIMAL(4,1)로 변경
ALTER TABLE annual_leave_transactions 
ALTER COLUMN amount TYPE DECIMAL(4,1);

-- 2. annual_leave_balances 테이블의 관련 컬럼들도 DECIMAL로 변경
ALTER TABLE annual_leave_balances 
ALTER COLUMN total_granted TYPE DECIMAL(4,1),
ALTER COLUMN total_used TYPE DECIMAL(4,1),
ALTER COLUMN total_expired TYPE DECIMAL(4,1),
ALTER COLUMN current_balance TYPE DECIMAL(4,1);

-- 변경 완료 확인용 코멘트
COMMENT ON COLUMN annual_leave_transactions.amount IS '거래량: DECIMAL(4,1) - 반차(0.5일) 지원';
COMMENT ON COLUMN annual_leave_balances.total_granted IS '총 부여: DECIMAL(4,1) - 반차 지원';
COMMENT ON COLUMN annual_leave_balances.total_used IS '총 사용: DECIMAL(4,1) - 반차 지원';
COMMENT ON COLUMN annual_leave_balances.total_expired IS '총 소멸: DECIMAL(4,1) - 반차 지원';
COMMENT ON COLUMN annual_leave_balances.current_balance IS '현재 잔액: DECIMAL(4,1) - 반차 지원';
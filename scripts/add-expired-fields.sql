-- annual_leave_transactions 테이블에 expired 필드 추가
-- expired_at: 연차가 소멸된 시각
-- expired_by: 소멸 처리한 사용자 (SYSTEM 또는 관리자)
-- is_expired: 소멸 여부 플래그

-- 1. expired 관련 컬럼 추가
ALTER TABLE annual_leave_transactions 
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- 2. 인덱스 추가 (소멸된 트랜잭션 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_is_expired 
ON annual_leave_transactions(is_expired);

CREATE INDEX IF NOT EXISTS idx_annual_leave_transactions_expired_at 
ON annual_leave_transactions(expired_at);

-- 3. 기존 expire 타입 트랜잭션들을 참고하여 관련 부여 트랜잭션 업데이트
-- (선택사항: 기존 데이터 마이그레이션)
UPDATE annual_leave_transactions AS grant_tx
SET 
    is_expired = TRUE,
    expired_at = expire_tx.created_at,
    expired_by = expire_tx.created_by
FROM annual_leave_transactions AS expire_tx
WHERE 
    expire_tx.transaction_type = 'expire'
    AND expire_tx.grant_date = grant_tx.grant_date
    AND expire_tx.member_id = grant_tx.member_id
    AND grant_tx.transaction_type IN ('grant', 'manual_grant')
    AND grant_tx.is_expired IS FALSE;

-- 4. 코멘트 추가
COMMENT ON COLUMN annual_leave_transactions.expired_at IS '연차가 소멸된 시각';
COMMENT ON COLUMN annual_leave_transactions.expired_by IS '소멸 처리한 사용자 (SYSTEM 또는 관리자명)';
COMMENT ON COLUMN annual_leave_transactions.is_expired IS '소멸 여부 (TRUE: 소멸됨, FALSE: 활성)';
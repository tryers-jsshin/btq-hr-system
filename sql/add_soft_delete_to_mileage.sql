-- work_mileage_transactions 테이블에 soft delete 기능 추가
ALTER TABLE work_mileage_transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_reason VARCHAR(50);

-- 삭제 이유: 'recalculation', 'leave_approved', 'leave_cancelled', 'schedule_changed', 'admin_adjust'

-- 조회 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_mileage_transactions_reference_deleted 
ON work_mileage_transactions(reference_id, deleted_at);

-- 활성 트랜잭션만 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW active_work_mileage_transactions AS
SELECT * FROM work_mileage_transactions
WHERE deleted_at IS NULL;
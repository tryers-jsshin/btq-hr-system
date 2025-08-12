-- Soft delete 롤백 SQL

-- 1. 뷰가 있다면 삭제
DROP VIEW IF EXISTS active_work_mileage_transactions;

-- 2. 인덱스 삭제
DROP INDEX IF EXISTS idx_mileage_transactions_reference_deleted;

-- 3. 컬럼 삭제
ALTER TABLE work_mileage_transactions 
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS deleted_reason;

-- 4. 만약 soft delete된 레코드들이 있다면 정리가 필요할 수 있습니다
-- 옵션 1: 삭제된 레코드 모두 제거 (주의: 이렇게 하면 히스토리가 사라집니다)
-- DELETE FROM work_mileage_transactions WHERE deleted_at IS NOT NULL;

-- 옵션 2: 중복 레코드 정리 (각 reference_id별로 최신 것만 남기기)
-- WITH duplicates AS (
--   SELECT id, 
--          ROW_NUMBER() OVER (PARTITION BY reference_id, transaction_type, transaction_date 
--                             ORDER BY created_at DESC) as rn
--   FROM work_mileage_transactions
--   WHERE reference_id IS NOT NULL
-- )
-- DELETE FROM work_mileage_transactions
-- WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
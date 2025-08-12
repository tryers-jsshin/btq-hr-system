-- 중복된 is_active=true 확인 및 수정

-- 1. 문제 있는 데이터 확인 (admin_adjust 제외)
SELECT 
  member_id,
  work_date,
  transaction_type,
  COUNT(*) as active_count
FROM work_mileage_transactions
WHERE is_active = true
  AND transaction_type != 'admin_adjust'
  AND work_date IS NOT NULL
GROUP BY member_id, work_date, transaction_type
HAVING COUNT(*) > 1;

-- 2. 중복 수정 (최신 것만 남기고 나머지는 false로)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY member_id, work_date, transaction_type 
      ORDER BY created_at DESC
    ) as rn
  FROM work_mileage_transactions
  WHERE is_active = true
    AND transaction_type != 'admin_adjust'
    AND work_date IS NOT NULL
)
UPDATE work_mileage_transactions
SET is_active = false
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3. 수정 후 확인
SELECT 
  member_id,
  work_date,
  transaction_type,
  COUNT(*) as active_count
FROM work_mileage_transactions
WHERE is_active = true
  AND work_date IS NOT NULL
GROUP BY member_id, work_date, transaction_type
ORDER BY member_id, work_date, transaction_type;
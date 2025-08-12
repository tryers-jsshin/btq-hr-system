-- 테스트 쿼리: 현재 데이터베이스 상태 확인

-- 1. work_mileage_transactions 테이블의 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_mileage_transactions'
ORDER BY ordinal_position;

-- 2. 기존 데이터 샘플 확인
SELECT * 
FROM work_mileage_transactions 
ORDER BY created_at DESC
LIMIT 10;

-- 3. 중복 데이터 확인
SELECT member_id, work_date, transaction_type, COUNT(*) as count
FROM work_mileage_transactions
WHERE work_date IS NOT NULL
GROUP BY member_id, work_date, transaction_type
HAVING COUNT(*) > 1;
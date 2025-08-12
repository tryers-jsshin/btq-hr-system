-- 마일리지 데이터 디버깅 쿼리

-- 1. 최근 마일리지 트랜잭션 확인
SELECT 
  member_id,
  work_date,
  transaction_type,
  minutes,
  event_source,
  is_active,
  created_at
FROM work_mileage_transactions
WHERE is_active = true
  AND work_date >= '2025-01-01'
ORDER BY work_date DESC, created_at DESC
LIMIT 20;

-- 2. 특정 멤버의 월별 집계 확인
-- member_id를 실제 값으로 변경해서 실행
/*
SELECT 
  transaction_type,
  SUM(minutes) as total_minutes,
  COUNT(*) as count
FROM work_mileage_transactions
WHERE member_id = 'YOUR_MEMBER_ID'
  AND work_date >= '2025-01-01'
  AND work_date <= '2025-01-31'
  AND is_active = true
GROUP BY transaction_type;
*/

-- 3. 전체 마일리지 잔액 확인
/*
SELECT 
  SUM(minutes) as total_balance
FROM work_mileage_transactions
WHERE member_id = 'YOUR_MEMBER_ID'
  AND is_active = true;
*/
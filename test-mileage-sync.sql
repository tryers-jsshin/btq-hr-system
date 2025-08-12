-- 마일리지 동기화 테스트 시나리오

-- 1. 테스트 멤버 확인
SELECT id, name, employee_number 
FROM members 
WHERE status = 'active' 
LIMIT 1;

-- 2. 최근 근태 기록 확인
SELECT 
  ar.member_id,
  ar.work_date,
  ar.check_in_time,
  ar.check_out_time,
  ar.late_minutes,
  ar.early_leave_minutes,
  ar.overtime_minutes,
  wt.name as work_type_name,
  wt.is_leave
FROM attendance_records ar
LEFT JOIN work_types wt ON ar.work_type_id = wt.id
WHERE ar.work_date >= '2025-01-01'
ORDER BY ar.work_date DESC
LIMIT 10;

-- 3. 마일리지 트랜잭션 확인 (이벤트 소싱 후)
SELECT 
  mt.member_id,
  mt.work_date,
  mt.transaction_type,
  mt.minutes,
  mt.event_source,
  mt.is_active,
  mt.created_at
FROM work_mileage_transactions mt
WHERE mt.work_date >= '2025-01-01'
  AND mt.is_active = true
ORDER BY mt.work_date DESC, mt.created_at DESC
LIMIT 20;

-- 4. 특정 날짜의 마일리지 히스토리 확인 (활성/비활성 모두)
-- (member_id와 work_date를 실제 값으로 변경하여 실행)
/*
SELECT 
  work_date,
  transaction_type,
  minutes,
  event_source,
  is_active,
  created_at
FROM work_mileage_transactions
WHERE member_id = 'YOUR_MEMBER_ID'
  AND work_date = 'YOUR_DATE'
ORDER BY created_at DESC;
*/

-- 5. 월별 마일리지 집계 (활성 레코드만)
SELECT 
  member_id,
  DATE_TRUNC('month', work_date::date) as month,
  SUM(CASE WHEN transaction_type = 'overtime' THEN minutes ELSE 0 END) as overtime_total,
  SUM(CASE WHEN transaction_type = 'late' THEN ABS(minutes) ELSE 0 END) as late_total,
  SUM(CASE WHEN transaction_type = 'early_leave' THEN ABS(minutes) ELSE 0 END) as early_leave_total,
  SUM(minutes) as net_total
FROM work_mileage_transactions
WHERE is_active = true
  AND work_date >= '2025-01-01'
GROUP BY member_id, DATE_TRUNC('month', work_date::date)
ORDER BY member_id, month;
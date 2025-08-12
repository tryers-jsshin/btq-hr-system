-- 1월 테스트 데이터 추가 (조기퇴근 10분)
-- member_id는 실제 테스트하는 계정의 ID로 변경하세요

INSERT INTO work_mileage_transactions (
  member_id,
  work_date,
  transaction_date,
  transaction_type,
  minutes,
  event_source,
  is_active
) VALUES (
  'YOUR_MEMBER_ID',  -- 실제 member_id로 변경
  '2025-01-10',
  '2025-01-10',
  'early_leave',
  -10,
  'manual',
  true
);
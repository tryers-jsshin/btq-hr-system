-- '오프' 근무 유형을 work_types 테이블에 추가
-- 이미 존재하는지 확인 후 추가
INSERT INTO work_types (name, start_time, end_time, bgcolor, fontcolor, deduction_days, is_leave)
SELECT '오프', '00:00:00', '00:00:00', '#f3f4f6', '#6b7280', NULL, false
WHERE NOT EXISTS (
    SELECT 1 FROM work_types WHERE name = '오프'
);

-- 오프는 휴가가 아니므로:
-- - deduction_days: NULL (연차 차감 없음)
-- - is_leave: false (휴가 유형이 아님)
-- - 색상: 회색 계열 (bg-gray-100, text-gray-600)
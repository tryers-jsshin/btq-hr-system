-- attendance_records 테이블에 unique constraint 추가
-- 동일한 직원이 같은 날짜에 중복 기록을 가질 수 없도록 제약

-- 기존 제약 조건 삭제 (있을 경우)
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS unique_attendance_record;

-- unique constraint 추가
ALTER TABLE attendance_records
ADD CONSTRAINT unique_attendance_record 
UNIQUE (employee_number, work_date);

-- 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'attendance_records'
    AND schemaname = 'public';

-- 제약 조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.attendance_records'::regclass;
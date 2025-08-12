-- 1단계: 현재 데이터 타입과 샘플 데이터 확인
SELECT 
    'work_schedule_entries' as table_name,
    work_type_id,
    pg_typeof(work_type_id) as data_type
FROM work_schedule_entries
LIMIT 5;

SELECT 
    'work_types' as table_name,
    id,
    pg_typeof(id) as data_type
FROM work_types
LIMIT 5;

-- 2단계: work_schedule_entries의 work_type_id가 VARCHAR인 경우
-- 옵션 A: 데이터가 UUID 형식의 문자열인 경우 (예: '53502651-7666-4a37-b53a-06b1d1065068')
ALTER TABLE work_schedule_entries 
ALTER COLUMN work_type_id TYPE UUID USING work_type_id::UUID;

-- 옵션 B: 데이터가 UUID 형식이 아닌 경우 - 먼저 백업 후 NULL로 설정
-- UPDATE work_schedule_entries SET work_type_id = NULL WHERE work_type_id IS NOT NULL;
-- ALTER TABLE work_schedule_entries ALTER COLUMN work_type_id TYPE UUID;

-- 3단계: attendance_records 테이블도 동일하게 처리
-- work_type_id 확인
SELECT 
    work_type_id,
    pg_typeof(work_type_id) as data_type
FROM attendance_records
WHERE work_type_id IS NOT NULL
LIMIT 5;

-- schedule_id 확인  
SELECT 
    schedule_id,
    pg_typeof(schedule_id) as data_type
FROM attendance_records
WHERE schedule_id IS NOT NULL
LIMIT 5;

-- 필요시 타입 변경
-- ALTER TABLE attendance_records ALTER COLUMN work_type_id TYPE UUID USING work_type_id::UUID;
-- ALTER TABLE attendance_records ALTER COLUMN schedule_id TYPE UUID USING schedule_id::UUID;
-- work_schedule_entries.work_type_id를 VARCHAR에서 UUID로 변경

-- 1. 먼저 현재 데이터 확인
SELECT 
    work_type_id,
    COUNT(*) as count
FROM work_schedule_entries
WHERE work_type_id IS NOT NULL
GROUP BY work_type_id
LIMIT 10;

-- 2. work_type_id가 이미 UUID 형식의 문자열인지 확인
-- UUID 형식: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX (36자)
SELECT 
    work_type_id,
    LENGTH(work_type_id) as length,
    work_type_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' as is_uuid_format
FROM work_schedule_entries
WHERE work_type_id IS NOT NULL
LIMIT 10;

-- 3. original_work_type_id도 동일하게 처리 필요
SELECT 
    original_work_type_id,
    COUNT(*) as count
FROM work_schedule_entries
WHERE original_work_type_id IS NOT NULL
GROUP BY original_work_type_id
LIMIT 10;

-- 4. 외래 키 제약 조건 삭제 (있을 경우)
ALTER TABLE work_schedule_entries 
DROP CONSTRAINT IF EXISTS work_schedule_entries_work_type_id_fkey;

-- 5. 데이터 타입 변경
-- work_type_id를 UUID로 변경
ALTER TABLE work_schedule_entries 
ALTER COLUMN work_type_id TYPE UUID 
USING work_type_id::UUID;

-- original_work_type_id도 UUID로 변경
ALTER TABLE work_schedule_entries 
ALTER COLUMN original_work_type_id TYPE UUID 
USING original_work_type_id::UUID;

-- 6. 외래 키 제약 조건 추가
ALTER TABLE work_schedule_entries 
ADD CONSTRAINT work_schedule_entries_work_type_id_fkey 
FOREIGN KEY (work_type_id) 
REFERENCES work_types(id) 
ON DELETE RESTRICT;

-- original_work_type_id에 대한 외래 키도 추가
ALTER TABLE work_schedule_entries 
ADD CONSTRAINT work_schedule_entries_original_work_type_id_fkey 
FOREIGN KEY (original_work_type_id) 
REFERENCES work_types(id) 
ON DELETE SET NULL;

-- 7. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_work_schedule_entries_work_type_id 
ON work_schedule_entries(work_type_id);

CREATE INDEX IF NOT EXISTS idx_work_schedule_entries_original_work_type_id 
ON work_schedule_entries(original_work_type_id);

-- 8. 변경 사항 확인
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'work_schedule_entries'
    AND column_name IN ('work_type_id', 'original_work_type_id');

-- 9. 외래 키 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'work_schedule_entries';

-- 10. Supabase 캐시 갱신 필요
-- Supabase 대시보드에서: Database > Settings > Reload Schema Cache
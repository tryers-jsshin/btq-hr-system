-- 데이터 타입 불일치 수정
-- work_schedule_entries.work_type_id를 UUID로 변경

-- 1. 먼저 현재 데이터 타입 확인
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.table_name IN ('work_schedule_entries', 'attendance_records', 'work_types', 'members')
    AND c.column_name IN ('id', 'work_type_id', 'member_id', 'schedule_id')
ORDER BY c.table_name, c.column_name;

-- 2. work_schedule_entries.work_type_id를 UUID로 변경
ALTER TABLE work_schedule_entries 
ALTER COLUMN work_type_id TYPE UUID USING work_type_id::UUID;

-- 3. attendance_records의 관련 컬럼들도 UUID로 변경 (필요한 경우)
ALTER TABLE attendance_records 
ALTER COLUMN work_type_id TYPE UUID USING work_type_id::UUID;

ALTER TABLE attendance_records 
ALTER COLUMN schedule_id TYPE UUID USING schedule_id::UUID;

-- member_id는 이미 UUID일 가능성이 높지만 확인 필요
-- ALTER TABLE attendance_records 
-- ALTER COLUMN member_id TYPE UUID USING member_id::UUID;

-- 4. 이제 외래 키 제약 조건 추가
-- 기존 제약 조건 삭제
ALTER TABLE work_schedule_entries DROP CONSTRAINT IF EXISTS work_schedule_entries_work_type_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_member_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_work_type_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_schedule_id_fkey;

-- 새로운 외래 키 제약 조건 추가
ALTER TABLE work_schedule_entries 
  ADD CONSTRAINT work_schedule_entries_work_type_id_fkey 
  FOREIGN KEY (work_type_id) 
  REFERENCES work_types(id) 
  ON DELETE RESTRICT;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES members(id)
  ON DELETE SET NULL;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_work_type_id_fkey
  FOREIGN KEY (work_type_id)
  REFERENCES work_types(id)
  ON DELETE SET NULL;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_schedule_id_fkey
  FOREIGN KEY (schedule_id)
  REFERENCES work_schedule_entries(id)
  ON DELETE SET NULL;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_work_schedule_entries_work_type_id
  ON work_schedule_entries(work_type_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_work_type_id
  ON attendance_records(work_type_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_schedule_id
  ON attendance_records(schedule_id);
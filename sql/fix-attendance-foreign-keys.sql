-- work_schedule_entries와 work_types 간의 외래 키 관계 확인 및 생성

-- 기존 외래 키 제약 조건 삭제 (이미 존재할 수 있음)
ALTER TABLE work_schedule_entries DROP CONSTRAINT IF EXISTS work_schedule_entries_work_type_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_member_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_work_type_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_schedule_id_fkey;

-- 외래 키 제약 조건 추가
ALTER TABLE work_schedule_entries 
  ADD CONSTRAINT work_schedule_entries_work_type_id_fkey 
  FOREIGN KEY (work_type_id) 
  REFERENCES work_types(id) 
  ON DELETE RESTRICT;

-- attendance_records와 관련 테이블들의 외래 키 관계 설정
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

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_work_schedule_entries_work_type_id
  ON work_schedule_entries(work_type_id);

-- Supabase 캐시 갱신을 위해 스키마 리로드가 필요할 수 있음
-- Supabase 대시보드에서 Database > Settings > Reload Schema Cache 실행
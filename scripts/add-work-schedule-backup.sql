-- work_schedule_entries 테이블에 백업 필드 추가
ALTER TABLE work_schedule_entries 
ADD COLUMN IF NOT EXISTS original_work_type_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS replaced_by_leave_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL;

-- 인덱스 추가 (연차 취소 시 빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_work_schedule_leave_backup 
ON work_schedule_entries(replaced_by_leave_id) 
WHERE replaced_by_leave_id IS NOT NULL;
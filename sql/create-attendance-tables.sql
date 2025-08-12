-- 출퇴근 스냅샷 테이블
CREATE TABLE IF NOT EXISTS attendance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  upload_date DATE NOT NULL,
  uploaded_by VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  total_records INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES attendance_snapshots(id) ON DELETE CASCADE,
  employee_number VARCHAR(20) NOT NULL,
  member_id UUID REFERENCES members(id),
  member_name VARCHAR(100) NOT NULL,
  work_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  
  -- 근무표 매칭 정보
  schedule_id UUID REFERENCES work_schedule_entries(id),
  work_type_id UUID REFERENCES work_types(id),
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  
  -- 계산된 값들
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  is_early_leave BOOLEAN DEFAULT false,
  early_leave_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  actual_work_minutes INTEGER DEFAULT 0,
  
  -- 수정 추적
  is_modified BOOLEAN DEFAULT false,
  modified_by VARCHAR(100),
  modified_at TIMESTAMP WITH TIME ZONE,
  modification_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 중복 방지를 위한 유니크 제약
  CONSTRAINT unique_attendance_record UNIQUE (employee_number, work_date)
);

-- 초과근무 정산 테이블
CREATE TABLE IF NOT EXISTS overtime_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  settlement_month VARCHAR(7) NOT NULL, -- YYYY-MM 형식
  
  -- 월별 집계
  total_overtime_minutes INTEGER DEFAULT 0,
  total_late_minutes INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  net_overtime_minutes INTEGER DEFAULT 0, -- 초과근무 - 지각시간
  
  -- 정산 정보
  converted_leave_days DECIMAL(3,1) DEFAULT 0, -- 연차/반차로 전환된 일수
  settlement_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, cancelled
  settled_by VARCHAR(100),
  settled_at TIMESTAMP WITH TIME ZONE,
  settlement_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 월별 중복 방지
  CONSTRAINT unique_monthly_settlement UNIQUE (member_id, settlement_month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_attendance_records_member_date 
  ON attendance_records(member_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_snapshot 
  ON attendance_records(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number 
  ON attendance_records(employee_number);
CREATE INDEX IF NOT EXISTS idx_overtime_settlements_member_month 
  ON overtime_settlements(member_id, settlement_month);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_snapshots_updated_at 
  BEFORE UPDATE ON attendance_snapshots 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at 
  BEFORE UPDATE ON attendance_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_settlements_updated_at 
  BEFORE UPDATE ON overtime_settlements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 (필요시 활성화)
-- ALTER TABLE attendance_snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE overtime_settlements ENABLE ROW LEVEL SECURITY;
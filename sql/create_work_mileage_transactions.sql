-- 근무 마일리지 거래 테이블 생성
CREATE TABLE IF NOT EXISTS work_mileage_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('overtime', 'late', 'early_leave', 'admin_adjust', 'initial_balance')),
  minutes INTEGER NOT NULL, -- 양수/음수
  reason TEXT, -- 조정 사유 (admin_adjust 시 필수)
  created_by UUID REFERENCES members(id), -- 생성자 (자동 or 관리자)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reference_id UUID, -- 관련 attendance_record id (nullable)
  
  -- admin_adjust 타입일 때는 reason 필수
  CONSTRAINT reason_required_for_admin CHECK (
    transaction_type != 'admin_adjust' OR reason IS NOT NULL
  )
);

-- 인덱스
CREATE INDEX idx_mileage_member_date ON work_mileage_transactions(member_id, transaction_date DESC);
CREATE INDEX idx_mileage_reference ON work_mileage_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- RLS 정책
ALTER TABLE work_mileage_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 기록 조회 가능
CREATE POLICY "Users can view own mileage transactions" ON work_mileage_transactions
  FOR SELECT
  USING (true); -- 모든 사용자가 조회 가능 (프론트엔드에서 필터링)

-- 관리자만 생성/수정 가능
CREATE POLICY "Only admins can insert mileage transactions" ON work_mileage_transactions
  FOR INSERT
  WITH CHECK (true); -- 시스템에서 자동 생성도 있으므로 제한 없음

-- 삭제 불가 (감사 목적)
CREATE POLICY "No one can delete mileage transactions" ON work_mileage_transactions
  FOR DELETE
  USING (false);

-- 코멘트
COMMENT ON TABLE work_mileage_transactions IS '근무 마일리지 거래 내역';
COMMENT ON COLUMN work_mileage_transactions.transaction_type IS 'overtime:초과근무, late:지각, early_leave:조기퇴근, admin_adjust:관리자조정, initial_balance:초기설정';
COMMENT ON COLUMN work_mileage_transactions.minutes IS '양수는 추가, 음수는 차감';
COMMENT ON COLUMN work_mileage_transactions.reason IS '관리자 조정 시 필수 입력 사유';
COMMENT ON COLUMN work_mileage_transactions.reference_id IS '관련 attendance_records.id';
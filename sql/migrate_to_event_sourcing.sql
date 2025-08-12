-- ============================================
-- 마일리지 이벤트 소싱 마이그레이션
-- ============================================

-- 1. 기존 테이블에 새 컬럼 추가
ALTER TABLE work_mileage_transactions 
  ADD COLUMN IF NOT EXISTS work_date DATE;

ALTER TABLE work_mileage_transactions 
  ADD COLUMN IF NOT EXISTS event_source VARCHAR(20);

ALTER TABLE work_mileage_transactions 
  ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE work_mileage_transactions 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- CHECK 제약 조건 추가 (이미 존재하면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_event_source' 
    AND conrelid = 'work_mileage_transactions'::regclass
  ) THEN
    ALTER TABLE work_mileage_transactions 
      ADD CONSTRAINT check_event_source 
      CHECK (event_source IN ('attendance', 'leave', 'schedule', 'manual', 'legacy'));
  END IF;
END $$;

-- 2. 기존 데이터 마이그레이션 (dev 환경이므로 간단히)
UPDATE work_mileage_transactions 
SET 
  work_date = transaction_date,
  event_source = CASE 
    WHEN reference_id IS NOT NULL THEN 'attendance'
    WHEN transaction_type = 'admin_adjust' THEN 'manual'
    ELSE 'legacy'
  END,
  source_id = reference_id,
  is_active = true
WHERE work_date IS NULL;

-- 3. 중복 레코드 처리 (같은 날짜, 같은 멤버의 이전 레코드 비활성화)
WITH duplicates AS (
  SELECT 
    id,
    member_id,
    work_date,
    ROW_NUMBER() OVER (
      PARTITION BY member_id, work_date, transaction_type 
      ORDER BY created_at DESC
    ) as rn
  FROM work_mileage_transactions
  WHERE work_date IS NOT NULL
)
UPDATE work_mileage_transactions
SET is_active = false
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 4. 새로운 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_mileage_work_date 
ON work_mileage_transactions(member_id, work_date, is_active);

CREATE INDEX IF NOT EXISTS idx_mileage_event_source 
ON work_mileage_transactions(event_source, source_id) 
WHERE source_id IS NOT NULL;

-- 5. 활성 마일리지만 조회하는 뷰 생성
CREATE OR REPLACE VIEW active_mileage_transactions AS
SELECT 
  id,
  member_id,
  work_date,
  transaction_date,
  transaction_type,
  minutes,
  reason,
  created_by,
  created_at,
  reference_id,
  event_source,
  source_id
FROM work_mileage_transactions
WHERE is_active = true;

-- 6. 마일리지 현재 상태 뷰 (날짜별 집계)
CREATE OR REPLACE VIEW mileage_daily_summary AS
SELECT 
  member_id,
  work_date,
  SUM(CASE WHEN transaction_type = 'overtime' THEN minutes ELSE 0 END) as overtime_minutes,
  SUM(CASE WHEN transaction_type = 'late' THEN ABS(minutes) ELSE 0 END) as late_minutes,
  SUM(CASE WHEN transaction_type = 'early_leave' THEN ABS(minutes) ELSE 0 END) as early_leave_minutes,
  SUM(minutes) as total_minutes
FROM work_mileage_transactions
WHERE is_active = true
GROUP BY member_id, work_date;

-- 7. RLS 정책 업데이트 (조건부 UPDATE 허용)
DROP POLICY IF EXISTS "No one can delete mileage transactions" ON work_mileage_transactions;

-- 업데이트 정책 (간소화)
CREATE POLICY "Allow mileage transaction updates" ON work_mileage_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 삭제는 여전히 불가 (감사 목적)
CREATE POLICY "No deletion of mileage transactions" ON work_mileage_transactions
  FOR DELETE
  USING (false);

-- 8. 함수: 날짜별 마일리지 재계산
CREATE OR REPLACE FUNCTION recalculate_mileage_for_date(
  p_member_id UUID,
  p_work_date DATE,
  p_source VARCHAR,
  p_source_id UUID,
  p_late_minutes INTEGER,
  p_early_leave_minutes INTEGER,
  p_overtime_minutes INTEGER
) RETURNS void AS $$
BEGIN
  -- 기존 활성 레코드 비활성화
  UPDATE work_mileage_transactions
  SET is_active = false
  WHERE member_id = p_member_id
    AND work_date = p_work_date
    AND is_active = true
    AND transaction_type != 'admin_adjust'; -- 관리자 조정은 유지

  -- 새 레코드 삽입
  IF p_late_minutes > 0 THEN
    INSERT INTO work_mileage_transactions (
      member_id, work_date, transaction_date, transaction_type, 
      minutes, event_source, source_id, is_active
    ) VALUES (
      p_member_id, p_work_date, p_work_date, 'late',
      -p_late_minutes, p_source, p_source_id, true
    );
  END IF;

  IF p_early_leave_minutes > 0 THEN
    INSERT INTO work_mileage_transactions (
      member_id, work_date, transaction_date, transaction_type,
      minutes, event_source, source_id, is_active
    ) VALUES (
      p_member_id, p_work_date, p_work_date, 'early_leave',
      -p_early_leave_minutes, p_source, p_source_id, true
    );
  END IF;

  IF p_overtime_minutes > 0 THEN
    INSERT INTO work_mileage_transactions (
      member_id, work_date, transaction_date, transaction_type,
      minutes, event_source, source_id, is_active
    ) VALUES (
      p_member_id, p_work_date, p_work_date, 'overtime',
      p_overtime_minutes, p_source, p_source_id, true
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. 코멘트 추가
COMMENT ON COLUMN work_mileage_transactions.work_date IS '실제 근무 날짜 (transaction_date와 동일)';
COMMENT ON COLUMN work_mileage_transactions.event_source IS '이벤트 발생 원인: attendance(근태), leave(연차), schedule(근무표), manual(관리자)';
COMMENT ON COLUMN work_mileage_transactions.source_id IS '원천 레코드 ID (attendance_id, leave_request_id 등)';
COMMENT ON COLUMN work_mileage_transactions.is_active IS '현재 유효한 레코드 여부 (이벤트 소싱)';

-- 10. 통계 확인 쿼리
SELECT 
  'Total Records' as metric,
  COUNT(*) as count
FROM work_mileage_transactions
UNION ALL
SELECT 
  'Active Records' as metric,
  COUNT(*) as count
FROM work_mileage_transactions
WHERE is_active = true
UNION ALL
SELECT 
  'Duplicate Records (Inactive)' as metric,
  COUNT(*) as count
FROM work_mileage_transactions
WHERE is_active = false;
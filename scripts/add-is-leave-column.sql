-- work_types 테이블에 is_leave 컬럼 추가

-- 1. is_leave 컬럼 추가 (기본값 false)
ALTER TABLE work_types 
ADD COLUMN IF NOT EXISTS is_leave BOOLEAN DEFAULT false;

-- 2. 기존 데이터 마이그레이션
-- deduction_days가 null이 아닌 모든 항목을 휴가 유형으로 설정
UPDATE work_types 
SET is_leave = true 
WHERE deduction_days IS NOT NULL;

-- 3. 특별히 '오프' 타입은 휴가가 아님
UPDATE work_types 
SET is_leave = false 
WHERE id = 'off';

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_work_types_is_leave ON work_types(is_leave);

-- 5. 코멘트 추가
COMMENT ON COLUMN work_types.is_leave IS '휴가 유형 여부 (true: 휴가, false: 근무)';

-- 확인용 쿼리
SELECT id, name, is_leave, deduction_days 
FROM work_types 
ORDER BY is_leave DESC, name;
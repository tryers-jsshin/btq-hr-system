-- work_types 테이블에 is_holiday 컬럼 추가
-- 휴무일 여부를 표시 (오프, 공휴일 등)
ALTER TABLE work_types 
ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN DEFAULT false;

-- 기존 '오프' 근무 유형을 휴무일로 업데이트
UPDATE work_types 
SET is_holiday = true 
WHERE name = '오프';

-- is_holiday 설명:
-- true: 휴무일 (오프, 공휴일 등) - 연차 계산에서 제외
-- false: 일반 근무일 또는 휴가 - 연차 계산에 포함

COMMENT ON COLUMN work_types.is_holiday IS '휴무일 여부 (true: 오프/공휴일, false: 근무일/휴가)';
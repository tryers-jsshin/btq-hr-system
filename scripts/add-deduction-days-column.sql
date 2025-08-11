-- work_types 테이블에 deduction_days 컬럼 추가
ALTER TABLE work_types 
ADD COLUMN deduction_days DECIMAL(3,1) DEFAULT NULL;

-- 기존 휴가 유형들의 기본 차감량 설정
UPDATE work_types 
SET deduction_days = CASE 
    WHEN name = '연차' THEN 1.0
    WHEN name = '오전반차' THEN 0.5
    WHEN name = '오후반차' THEN 0.5
    ELSE NULL
END
WHERE name IN ('연차', '오전반차', '오후반차');

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN work_types.deduction_days IS '휴가 유형의 연차 차감량 (일반 근무 유형은 NULL)';
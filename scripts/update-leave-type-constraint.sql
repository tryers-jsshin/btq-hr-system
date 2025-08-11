-- leave_requests 테이블의 leave_type 체크 제약 확인 및 수정

-- 1. 기존 체크 제약 제거
ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- 2. leave_type을 자유로운 텍스트로 허용 (체크 제약 없음)
-- 이미 VARCHAR 타입이므로 타입 변경은 불필요

-- 또는 work_types 테이블과 연동하려면 아래처럼 외래키 관계 설정 가능
-- 하지만 유연성을 위해 체크 제약 없이 사용하는 것을 권장

COMMENT ON COLUMN leave_requests.leave_type IS '휴가 유형 (work_types.name과 매칭되어야 함)';

-- 확인용 쿼리
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'leave_requests' 
AND constraint_type = 'CHECK';
-- expire_after_months 컬럼 제거
-- 이 필드는 더 이상 사용되지 않음. 소멸 로직은 코드에서 입사일 기준으로 자동 계산됨
-- 첫 해: 입사 1주년 당일 자정에 소멸
-- 2년차 이후: 매년 입사기념일 자정에 소멸

ALTER TABLE annual_leave_policies 
DROP COLUMN IF EXISTS expire_after_months;

-- 제거 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'annual_leave_policies' 
ORDER BY ordinal_position;
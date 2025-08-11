-- members 테이블에 is_admin 필드 추가 (없는 경우)
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 특정 사용자를 관리자로 설정 (예시)
-- UPDATE members SET is_admin = true WHERE name = '관리자이름';
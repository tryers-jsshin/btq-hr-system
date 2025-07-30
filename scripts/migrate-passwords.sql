-- 기존 평문 비밀번호를 해시화하는 마이그레이션 가이드
-- 이 스크립트는 직접 실행하지 말고, 애플리케이션의 migratePasswordsToHash() 함수를 사용하세요.

-- 1. 현재 평문 비밀번호 상태 확인
SELECT 
  id, 
  employee_id, 
  name,
  CASE 
    WHEN LENGTH(password) = 64 AND password ~ '^[a-f0-9]+$' THEN '해시화됨'
    ELSE '평문'
  END as password_status
FROM members
ORDER BY created_at;

-- 2. 애플리케이션에서 다음 함수를 실행하여 마이그레이션:
-- const result = await supabaseMemberStorage.migratePasswordsToHash()
-- console.log(result.message)

-- 3. 마이그레이션 후 확인
-- SELECT COUNT(*) as total_members,
--        SUM(CASE WHEN LENGTH(password) = 64 AND password ~ '^[a-f0-9]+$' THEN 1 ELSE 0 END) as hashed_passwords
-- FROM members;

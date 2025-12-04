-- 1. pgcrypto 확장 활성화 확인
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. 기존 관리자 계정 확인
SELECT id, email, name, role, password IS NOT NULL as has_password
FROM users
WHERE email = 'gwp@envision.co.kr';

-- 3. 기존 관리자 계정이 있다면 삭제 (있을 경우에만)
DELETE FROM users WHERE email = 'gwp@envision.co.kr';

-- 4. 관리자 계정 새로 생성
INSERT INTO users (id, email, name, role, password, created_at)
VALUES (
  gen_random_uuid(),
  'gwp@envision.co.kr',
  '관리자',
  'admin',
  crypt('1fbyep', gen_salt('bf')),
  NOW()
);

-- 5. 비밀번호 확인 함수 재생성
CREATE OR REPLACE FUNCTION check_password(user_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT password INTO stored_password
  FROM users
  WHERE id = user_id;

  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_password = crypt(input_password, stored_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 생성된 계정 확인
SELECT id, email, name, role, password IS NOT NULL as has_password, created_at
FROM users
WHERE email = 'gwp@envision.co.kr';

-- 7. 비밀번호 테스트 (위에서 나온 id를 여기에 입력해서 테스트)
-- SELECT check_password('여기에-uuid-입력', '1fbyep');

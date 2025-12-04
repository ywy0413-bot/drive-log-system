-- 1. users 테이블에 pin 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

-- 2. password 컬럼 추가 (관리자용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. 관리자 계정 생성
INSERT INTO users (id, email, name, role, password, created_at)
VALUES (
  gen_random_uuid(),
  'gwp@envision.co.kr',
  '관리자',
  'admin',
  crypt('1fbyep', gen_salt('bf')), -- bcrypt 해싱
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 참고: Supabase에서 bcrypt를 사용하려면 pgcrypto 확장이 필요합니다
-- 이미 활성화되어 있을 가능성이 높지만, 혹시 모르니 실행:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. 비밀번호 확인 함수 생성
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

-- ========================================
-- 자가운전대장 데이터베이스 전체 설정
-- ========================================

-- 1. pgcrypto 확장 활성화 (비밀번호 암호화용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee',
  vehicle_type VARCHAR(20),
  pin VARCHAR(4),
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. drive_records 테이블 생성
CREATE TABLE IF NOT EXISTS drive_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drive_date DATE NOT NULL,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  waypoints TEXT[],
  distance DECIMAL(10, 2) NOT NULL,
  client_name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. fuel_rates 테이블 생성
CREATE TABLE IF NOT EXISTS fuel_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type VARCHAR(20) NOT NULL,
  rate_per_km DECIMAL(10, 2) NOT NULL,
  effective_from DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. monthly_settlements 테이블 생성
CREATE TABLE IF NOT EXISTS monthly_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_distance DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 6. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_drive_records_user_id ON drive_records(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_records_date ON drive_records(drive_date);
CREATE INDEX IF NOT EXISTS idx_drive_records_status ON drive_records(status);
CREATE INDEX IF NOT EXISTS idx_monthly_settlements_user_id ON monthly_settlements(user_id);

-- 7. 비밀번호 확인 함수 생성
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

-- 8. 관리자 계정 생성
INSERT INTO users (email, name, role, password, created_at)
VALUES (
  'gwp@envision.co.kr',
  '관리자',
  'admin',
  crypt('1fbyep', gen_salt('bf')),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 9. 기본 연료비 요율 설정 (예시)
INSERT INTO fuel_rates (vehicle_type, rate_per_km, effective_from)
VALUES
  ('diesel', 150.0, '2024-01-01'),
  ('gasoline', 160.0, '2024-01-01'),
  ('electric', 80.0, '2024-01-01')
ON CONFLICT DO NOTHING;

-- 10. RLS(Row Level Security) 비활성화 (개발용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE drive_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settlements DISABLE ROW LEVEL SECURITY;

-- 완료 확인
SELECT 'Database setup completed!' as status;
SELECT '관리자 계정: gwp@envision.co.kr / 1fbyep' as admin_account;

-- 자가운전대장 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
  vehicle_type TEXT CHECK (vehicle_type IN ('diesel', 'gasoline', 'electric')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 유류 기준 금액 테이블
CREATE TABLE fuel_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('diesel', 'gasoline', 'electric')),
  rate_per_km NUMERIC(10, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 운행 기록 테이블
CREATE TABLE drive_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drive_date DATE NOT NULL,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  waypoints TEXT[],
  distance NUMERIC(10, 2) NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'settled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 월별 정산 테이블
CREATE TABLE monthly_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  total_distance NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'settled')),
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 인덱스 생성
CREATE INDEX idx_drive_records_user_id ON drive_records(user_id);
CREATE INDEX idx_drive_records_date ON drive_records(drive_date);
CREATE INDEX idx_drive_records_status ON drive_records(status);
CREATE INDEX idx_monthly_settlements_user_id ON monthly_settlements(user_id);
CREATE INDEX idx_monthly_settlements_year_month ON monthly_settlements(year, month);

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_drive_records_updated_at BEFORE UPDATE ON drive_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_rates ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 데이터만 볼 수 있음
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own drive records" ON drive_records
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own drive records" ON drive_records
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own draft records" ON drive_records
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    AND status = 'draft'
  );

CREATE POLICY "Users can delete own draft records" ON drive_records
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    AND status = 'draft'
  );

-- RLS 정책: 관리자는 모든 데이터를 볼 수 있음
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all drive records" ON drive_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all drive records" ON drive_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- 유류 기준 금액은 관리자만 관리
CREATE POLICY "Everyone can view fuel rates" ON fuel_rates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage fuel rates" ON fuel_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- 월별 정산 조회
CREATE POLICY "Users can view own settlements" ON monthly_settlements
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all settlements" ON monthly_settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage settlements" ON monthly_settlements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- 초기 데이터: 기본 유류 기준 금액 (예시)
INSERT INTO fuel_rates (vehicle_type, rate_per_km, effective_from) VALUES
  ('diesel', 150.00, '2024-01-01'),
  ('gasoline', 160.00, '2024-01-01'),
  ('electric', 50.00, '2024-01-01');

-- Monthly Fuel Prices Table
-- 월별 연료 가격 테이블 (리터/kWh당 원)

CREATE TABLE IF NOT EXISTS monthly_fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  gasoline_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- 휘발유 (원/L)
  diesel_price NUMERIC(10, 2) NOT NULL DEFAULT 0,   -- 경유 (원/L)
  electric_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- 전기 (원/kWh)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fuel_prices_year_month ON monthly_fuel_prices(year, month);

-- RLS (Row Level Security) 비활성화
-- 참고: 현재 앱은 클라이언트 측 인증을 사용하므로 RLS를 비활성화합니다.
-- 보안은 애플리케이션 레벨에서 처리됩니다.
ALTER TABLE monthly_fuel_prices DISABLE ROW LEVEL SECURITY;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_fuel_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS update_fuel_prices_timestamp ON monthly_fuel_prices;
CREATE TRIGGER update_fuel_prices_timestamp
  BEFORE UPDATE ON monthly_fuel_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_fuel_prices_updated_at();

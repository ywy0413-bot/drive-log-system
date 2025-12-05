-- Add fuel_efficiency column to users table
-- 연비: 휘발유/경유는 km/L, 전기는 km/kWh 단위

ALTER TABLE users ADD COLUMN IF NOT EXISTS fuel_efficiency NUMERIC(10, 2) DEFAULT 10.0;

COMMENT ON COLUMN users.fuel_efficiency IS '연비: 휘발유/경유는 km/L, 전기는 km/kWh';

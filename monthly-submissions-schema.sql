-- 월별 운행기록 제출 관리 테이블
CREATE TABLE IF NOT EXISTS monthly_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  settlement_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 같은 사용자가 같은 월에 중복 제출 방지
  UNIQUE(user_id, year, month)
);

-- settlement_amount 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE monthly_submissions ADD COLUMN IF NOT EXISTS settlement_amount INTEGER;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_monthly_submissions_user_id ON monthly_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_submissions_status ON monthly_submissions(status);
CREATE INDEX IF NOT EXISTS idx_monthly_submissions_year_month ON monthly_submissions(year, month);

-- RLS (Row Level Security) 비활성화
-- 참고: 현재 앱은 클라이언트 측 인증을 사용하므로 RLS를 비활성화합니다.
-- 보안은 애플리케이션 레벨에서 처리됩니다.
ALTER TABLE monthly_submissions DISABLE ROW LEVEL SECURITY;

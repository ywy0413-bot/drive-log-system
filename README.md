# 자가운전대장 관리 시스템

운행 기록을 웹/모바일에서 간편하게 관리하는 시스템입니다.

## 주요 기능

### 직원 기능
- ✅ 운행 기록 입력 (출발지, 도착지, 경유지, 운행거리, 외근지)
- ✅ Kakao Maps API를 통한 자동 거리 계산
- ✅ 월별 운행 기록 조회
- ✅ 월 마감 요청
- ✅ 모바일 반응형 지원

### 관리자 기능
- ✅ 직원 관리 (차종 설정)
- ✅ 유류 기준 금액 설정
- ✅ 월별 정산 처리
- ✅ 정산 승인 및 마감

## 기술 스택

- **Frontend**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Maps**: Kakao Maps API
- **Deployment**: Vercel (무료)

## 시작하기

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입
2. 새 프로젝트 생성
3. SQL Editor에서 `supabase-schema.sql` 파일 내용 실행
4. Settings > API에서 다음 정보 복사:
   - `Project URL`
   - `anon public key`

### 2. Kakao Maps API 키 발급

1. [Kakao Developers](https://developers.kakao.com)에 가입
2. 애플리케이션 추가
3. 플랫폼 설정에서 웹 플랫폼 추가
   - 사이트 도메인: `http://localhost:3000` (개발용)
4. JavaScript 키 복사

### 3. 환경 변수 설정

`.env.local` 파일을 수정하여 실제 키 입력:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Kakao Maps API
NEXT_PUBLIC_KAKAO_APP_KEY=your_kakao_javascript_key
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```
자가운전/
├── app/                    # Next.js App Router
│   ├── login/             # 로그인 페이지
│   ├── employee/          # 직원 페이지
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API Routes
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   └── globals.css        # 전역 스타일
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 라이브러리 설정
│   └── supabase.ts       # Supabase 클라이언트
├── types/                 # TypeScript 타입 정의
│   └── index.ts
├── public/                # 정적 파일
└── supabase-schema.sql   # 데이터베이스 스키마
```

## 데이터베이스 스키마

### users (사용자)
- id, email, name, role, vehicle_type

### drive_records (운행 기록)
- id, user_id, drive_date, departure, destination, waypoints, distance, client_name, status

### fuel_rates (유류 기준 금액)
- id, vehicle_type, rate_per_km, effective_from, effective_to

### monthly_settlements (월별 정산)
- id, user_id, year, month, total_distance, total_amount, status

## 배포

### Vercel에 배포하기

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 환경 변수 설정 (Settings > Environment Variables)
4. 배포

## 다음 단계

- [ ] 로그인 페이지 구현
- [ ] 직원 대시보드 구현
- [ ] 관리자 대시보드 구현
- [ ] Kakao Maps 연동
- [ ] 월별 정산 기능 구현

## 라이선스

MIT

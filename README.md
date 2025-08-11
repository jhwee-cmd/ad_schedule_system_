# 캘린더 광고 관리 시스템

광고 스케줄을 효율적으로 관리하는 웹 애플리케이션입니다.

## 🚀 기술 스택

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Supabase (PostgreSQL)
- **UI**: TailwindCSS + Lucide React
- **배포**: Vercel (예정)

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── SpreadsheetView.tsx # 광고 스케줄 스프레드시트 뷰
│   └── SettingsView.tsx   # 설정 관리 뷰
├── hooks/                 # 커스텀 훅
│   ├── useAds.ts         # 광고 데이터 관리 훅
│   └── useSettings.ts    # 설정 관리 훅
├── services/             # 서비스 레이어
│   └── adService.ts      # Supabase 연동 서비스
├── types/                # TypeScript 타입 정의
│   └── database.ts       # 데이터베이스 타입
├── data/                 # 마스터 데이터
│   └── masterData.ts     # 하드코딩된 마스터 데이터
└── lib/                  # 유틸리티
    └── supabase.ts       # Supabase 클라이언트
```

## 🗄️ 데이터베이스 구조

### 테이블 구조

1. **campaigns** - 캠페인 메타정보
   - `campaign_id` (PK)
   - `advertiser_name` (광고주명)
   - `sales_owner` (담당자)
   - `status` (draft/proposed/confirmed/cancelled)
   - `budget`, `description`

2. **ad_schedules** - 광고 스케줄 (핵심 테이블)
   - `ad_schedule_id` (PK)
   - `campaign_id` (FK → campaigns)
   - `banner_id` (지면 정보)
   - `start_date`, `end_date`
   - `guaranteed_exposure` (보장 노출수)
   - `memo`, `is_bundle`, `bundle_name`

3. **ad_schedule_targets** - 타겟 국가 (1:N)
   - `id` (PK)
   - `ad_schedule_id` (FK → ad_schedules)
   - `country_code` (국가 코드)

## 🔧 주요 기능

### 광고 관리
- 스프레드시트 형태로 광고 일정 조회/편집
- 제안/확정 상태 관리
- 광고주별 색상 구분
- 실시간 데이터 동기화

### 설정 관리
- UI를 통한 하드코딩 값 편집
- localStorage를 통한 설정 저장
- 카테고리, 슬롯 타입, 국가 관리

### 데이터 연동
- Supabase를 통한 실시간 데이터 동기화
- 오프라인 fallback 지원

## 🎯 핵심 컴포넌트 역할

- **page.tsx**: 메인 컨트롤러, 전체 상태 관리
- **useAds.ts**: 광고 데이터 CRUD 로직
- **adService.ts**: Supabase 연동 레이어
- **SpreadsheetView.tsx**: 광고 목록 표시/편집 UI
- **SettingsView.tsx**: 설정 관리 UI

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 설정을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://etruczhhgpomwhftoswd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cnVjemhoZ3BvbXdoZnRvc3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODk0NjcsImV4cCI6MjA2OTQ2NTQ2N30.4tphjNopN4ELm8O18QabCp4AqrhzxjsoS3ExmwkVcfM
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📊 하드코딩된 마스터 데이터

데이터베이스에 저장하지 않고 코드에서 관리되는 데이터:

- **카테고리**: 메인홈, 체크리스트, 숏컷, 인터랙티브, 인앱페이지
- **슬롯 타입**: 타겟1-7, 제안1-2, Biz-core
- **가격 정보**: 일일 최대 노출수, CTR 정보
- **국가/대륙 정보**: 전 세계 국가 리스트

## 🔄 빌드 및 배포

### 빌드

```bash
npm run build
```

### 배포 (Vercel)

```bash
npm run deploy
```

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

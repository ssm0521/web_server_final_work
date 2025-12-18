# 학교 출석 관리 시스템

학과/학기/과목 단위 출석 관리 시스템

## 기술 스택

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL + Prisma ORM
- **Authentication**: NextAuth.js v5
- **Form Validation**: React Hook Form + Zod
- **State Management**: TanStack Query + Zustand

## 시작하기

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
DATABASE_URL="mysql://user:password@localhost:3306/attendance_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 Prisma 마이그레이션을 실행하세요:

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# 또는 개발 중에는 push 사용
npm run db:push
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
web_server_final/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지
│   ├── (dashboard)/       # 대시보드 (역할별)
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── db.ts             # Prisma 클라이언트
│   ├── auth.ts           # NextAuth 설정
│   └── utils.ts
├── prisma/               # Prisma 스키마
│   └── schema.prisma
└── types/                # TypeScript 타입 정의
```

## 주요 기능

### 사용자 역할
- **관리자 (Admin)**: 학과/학기/과목 관리, 사용자 관리, 시스템 설정
- **담당교원 (Instructor)**: 강의 일정 설정, 출석 관리, 공결 승인
- **수강생 (Student)**: 출석 체크, 출석 현황 확인, 공결 신청

### 핵심 기능
- 강의/수업 관리 (학년/학기/주차 일정)
- 출석 진행 (전자출결, 인증번호, 호명)
- 공결/사유 결재 워크플로
- 정정/이의제기
- 알림/커뮤니케이션
- 감사/보안/개인정보

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run db:generate` - Prisma 클라이언트 생성
- `npm run db:push` - 스키마를 DB에 푸시 (개발용)
- `npm run db:migrate` - 마이그레이션 실행
- `npm run db:studio` - Prisma Studio 실행

## 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.
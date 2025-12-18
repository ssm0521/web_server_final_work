# API 문서

## Swagger UI 접속

개발 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

```
http://localhost:3000/api-docs
```

또는 헤더의 "API 문서" 링크를 클릭하세요.

## API 엔드포인트 개요

### 인증
- `POST /api/auth/register` - 사용자 회원가입

### 사용자 관리 (관리자 전용)
- `GET /api/users` - 사용자 목록 조회
- `POST /api/users` - 사용자 생성
- `GET /api/users/[id]` - 사용자 상세 조회
- `PATCH /api/users/[id]` - 사용자 수정
- `DELETE /api/users/[id]` - 사용자 삭제

### 강의 관리
- `GET /api/courses` - 강의 목록 조회
- `POST /api/courses` - 강의 생성
- `GET /api/courses/[id]` - 강의 상세 조회
- `PATCH /api/courses/[id]` - 강의 수정
- `DELETE /api/courses/[id]` - 강의 삭제

### 출석 관리
- `POST /api/sessions/[id]/attend` - 학생 출석 체크
- `GET /api/sessions/[id]/attendance` - 출석 현황 조회
- `POST /api/sessions/[id]/open` - 출석 열기
- `POST /api/sessions/[id]/close` - 출석 마감

### 공결/이의제기
- `POST /api/sessions/[id]/excuses` - 공결 신청
- `GET /api/excuses` - 공결 목록 조회
- `PATCH /api/excuses/[id]` - 공결 승인/반려
- `POST /api/attendance/[id]/appeals` - 이의제기 신청
- `GET /api/appeals` - 이의제기 목록 조회
- `PATCH /api/appeals/[id]` - 이의제기 처리

### 리포트
- `GET /api/courses/[id]/reports/attendance` - 출석률 통계
- `GET /api/courses/[id]/reports/risk` - 위험군 분석
- `GET /api/excuses/reports` - 공결 승인율 리포트

### 감사 로그 (관리자 전용)
- `GET /api/audit-logs` - 감사 로그 조회

## 인증

대부분의 API는 NextAuth.js 세션 쿠키를 사용한 인증이 필요합니다.

Swagger UI에서 API를 테스트하려면:
1. 브라우저에서 로그인하여 세션 쿠키를 생성
2. Swagger UI에서 "Authorize" 버튼 클릭
3. 쿠키 값을 입력 (또는 브라우저가 자동으로 전송)

## Swagger JSON

Swagger JSON 스펙은 다음 URL에서 확인할 수 있습니다:

```
http://localhost:3000/api/swagger.json
```

이 JSON을 사용하여 Postman, Insomnia 등의 API 클라이언트에서 import할 수 있습니다.


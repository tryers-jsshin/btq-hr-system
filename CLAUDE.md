# BTQ HR 시스템 - 프로젝트 가이드

## 🎯 프로젝트 개요
중소기업을 위한 종합 인사 관리 시스템 (HR Management System)

## 📚 문서 구조
- **제품 요구사항 (PRD)**: [`/docs/PRD.md`](./docs/PRD.md)
  - 시스템 기능 명세
  - 페이지 라우팅
  - 컴포넌트 목록
  - 데이터 저장소 모듈

- **디자인 시스템**: [`/docs/theme.md`](./docs/theme.md)
  - Linear Light 테마
  - 색상, 타이포그래피, 간격
  - 컴포넌트 스타일 가이드
  - 모바일 최적화

- **데이터베이스 스키마**: [`/docs/database-schema.md`](./docs/database-schema.md)
  - 테이블 구조
  - 관계 정의
  - 인덱스 및 제약조건

- **코딩 컨벤션**: [`/docs/conventions.md`](./docs/conventions.md)
  - 코드 스타일 가이드
  - 네이밍 규칙
  - 파일 구조

## ⚠️ 중요 지침

### UI/UX 작업 시
- **반드시** `/docs/theme.md`의 Linear Light 테마 적용
- 모든 색상, 간격, 타이포그래피는 테마 토큰 사용
- 하드코딩 절대 금지

### 개발 원칙
1. **테마 우선**: 모든 스타일링은 theme.md 기준
2. **타입 안전**: TypeScript 타입 정의 필수
3. **성능 최적화**: 불필요한 리렌더링 방지
4. **접근성**: ARIA 레이블, 키보드 네비게이션 지원

### 보안
- 민감 정보 로깅 금지
- 비밀번호는 반드시 해싱
- API 키는 환경 변수로 관리

## 🚀 시작하기
```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 타입 체크
npm run typecheck
```

## 🤖 문서 자동화 명령어

### 커스텀 명령어
사용자가 다음 명령어를 입력하면 자동으로 문서를 업데이트합니다:

- **`/update-docs`** - 모든 문서 자동 업데이트
- **`/update-prd`** - PRD.md만 업데이트 (기능 명세)
- **`/update-schema`** - database-schema.md만 업데이트 (DB 구조)
- **`/check-docs`** - 변경사항 확인 (업데이트 없이 체크만)
- **`/sync-docs`** - 모든 문서 동기화 상태 확인

### 사용 예시
```
"/update-docs 연차 승인 기능 수정했으니 문서 업데이트해줘"
"/update-schema members 테이블에 status 컬럼 추가 반영해줘"
"/update-prd 새로운 대시보드 페이지 추가 반영해줘"
"/check-docs 현재 문서들이 최신 상태인지 확인해줘"
```

### 자동 업데이트 규칙
코드 변경 시 다음 문서가 자동으로 업데이트 대상이 됩니다:

| 변경 유형 | 업데이트 대상 | 자동 감지 |
|---------|------------|----------|
| 페이지 추가/삭제 | PRD.md - 라우팅 섹션 | ✅ |
| 컴포넌트 추가 | PRD.md - 컴포넌트 섹션 | ✅ |
| DB 테이블 변경 | database-schema.md | ✅ |
| API 함수 추가 | PRD.md - 저장소 모듈 섹션 | ✅ |
| UI 스타일 변경 | theme.md 준수 확인 | ✅ |

## 📝 주의사항
- 모든 문서는 `/docs` 디렉토리 참조
- 기능 추가/변경 시 `/update-docs` 명령어로 문서 동기화
- 커밋 전 린트 및 타입 체크 실행
- 문서 업데이트 시 변경 이력 자동 기록
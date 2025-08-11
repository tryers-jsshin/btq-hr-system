# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 필요한 가이드를 제공합니다.

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 코드 린트
npm run lint

# 프로덕션 서버 시작
npm run start
```

## 프로젝트 아키텍처

Next.js 15, React 19, TypeScript, Supabase로 구축된 한국어 HR 관리 시스템입니다. 직원의 연차 관리에 중점을 둔 애플리케이션입니다.

### 데이터베이스 아키텍처
- **Supabase PostgreSQL** 백엔드 데이터베이스
- `types/database.ts`에서 타입 안전한 데이터베이스 스키마 정의:
  - `members`: 직원 정보, 상태 추적 (active/terminated/rehired), weekly_schedule (JSONB), employee_number
  - `teams`: 팀 조직 구조, member_count 자동 추적
  - `work_types`: 근무 유형, 시간 범위 및 색상 코딩 (bgcolor/fontcolor), is_leave 플래그로 휴가 유형 구분
  - `work_schedule_entries`: 일별 근무 일정, members와 work_types 연결, original_work_type_id와 replaced_by_leave_id로 휴가 백업/복원
  - `termination_logs`: 직원 퇴사 이력 추적, action 유형 (terminate/cancel/rehire)
  - `annual_leave_policies`: 연차 정책 설정, 첫 해 월별 부여, 연간 증분, 소멸 규칙
  - `annual_leave_transactions`: 모든 연차 활동 거래 로그 (grant/use/expire/adjust), use 트랜잭션은 reference_id로 부여 참조
  - `annual_leave_balances`: 구성원별 연차 잔액 요약, 부여/사용/소멸 총계
  - `leave_requests`: 연차 신청 관리 (신청/승인/반려/취소)
- 스토리지 패턴: `lib/supabase-[엔티티]-storage.ts` 일관된 명명 규칙

### 애플리케이션 구조
- **App Router** 아키텍처, 한국어 라우트 이름 사용
- **조건부 레이아웃 시스템**: 로그인 페이지는 전체 화면, 나머지는 사이드바 레이아웃 (`components/conditional-layout.tsx`)
- **인증 및 라우트 보호**: `components/route-guard.tsx`에서 인증 상태 처리
- **반응형 디자인**: 데스크톱 사이드바 + 모바일 네비게이션 (`components/mobile-nav.tsx`)

### 주요 기능
- **연차 관리**: `lib/annual-leave-policy.ts`의 복잡한 정책 엔진:
  - 첫 해 월별 부여 (월 1일씩 최대까지)
  - 근속년수 기반 연간 부여 (15-25일, 점진적 증가)
  - 첫 해/연간 연차 다른 규칙의 자동 소멸 처리
  - 누락된 부여/소멸에 대한 소급 처리
- **구성원 관리**: 퇴사 및 재입사 포함 직원 생명주기
- **근무 일정 관리**: 대량 작업 지원하는 유연한 근무 유형 시스템
- **팀 관리**: 팀 기반 조직 구조

### 연차 정책 엔진
핵심 비즈니스 로직은 `AnnualLeavePolicyEngine` 클래스에 구현:
- 입사일과 근속년수 기반 연차 계산
- 두 단계 처리: 첫 해 월별 부여 및 연간 부여
- 미사용 연차 자동 소멸 관리
- 누락된 부여에 대한 소급 처리 지원
- 계산 디버깅을 위한 종합적인 로깅

### UI 컴포넌트
- **shadcn/ui** 컴포넌트 라이브러리, 전체 Radix UI 통합
- 폼, 카드, 다이얼로그용 커스텀 비즈니스 컴포넌트
- 일관된 명명 패턴: 모달 폼은 `[엔티티]-[액션]-dialog.tsx`
- Tailwind CSS를 사용한 모바일 반응형 디자인

### 환경 설정
- `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경 변수 필요
- 한국어 로케일 지원 (레이아웃에서 `lang="ko"`)

### 개발 참고사항
- TypeScript strict mode 활성화
- 데이터베이스 타입은 중앙 집중화되어 스토리지 모듈 전반에서 임포트
- 각 엔티티는 CRUD 작업을 위한 자체 스토리지 모듈 보유
- 폼 유효성 검사는 Zod 스키마와 함께 react-hook-form 사용
- 컴포넌트는 UI 라벨에서 한국어 명명 규칙 따름

---

# 연차 신청·승인 시스템 구현 현황 (Implementation Status)

## ✅ 구현 완료 사항

### 1. 동적 휴가 유형 분류 시스템

**기술적 구현**:
- `deduction_days` 필드 기반 동적 휴가/근무 유형 분류
- 기존 하드코딩: `["연차", "오전반차", "오후반차"]` → 현재: `deduction_days !== null`
- 확장 가능한 휴가 유형 지원 (특별휴가, 병가, 경조휴가 등)

**적용된 파일들**:
- `/app/settings/work-types/page.tsx:62` - 휴가 유형 필터링
- `/components/work-type-card.tsx:22` - 휴가 유형 감지 로직  
- `/components/leave-request-form-dialog.tsx:59-61` - 동적 휴가 유형 로딩
- `/components/work-schedule-edit-dialog.tsx:44-46` - 근무 유형 필터링
- `/lib/supabase-work-schedule-storage.ts:129,279,282,428,431` - 다양한 휴가 보호 로직

### 2. 지능형 중복 신청 방지 시스템

**현재 정책**: 
- 동일 날짜에 여러 휴가 신청 완전 차단 (대기중/승인됨 상태 모두)
- 오전반차 + 오후반차 조합도 불가 (단순하고 명확한 정책)

**핵심 로직** (`/lib/supabase-leave-request-storage.ts:checkDailyLeaveLimit`):
```typescript
// 해당 날짜에 이미 휴가가 있는지 확인
const { data: existingLeaves } = await supabase
  .from("leave_requests")
  .select("leave_type, status")
  .eq("member_id", memberId)
  .in("status", ["대기중", "승인됨"])
  .lte("start_date", dateStr)
  .gte("end_date", dateStr)

if (existingLeaves && existingLeaves.length > 0) {
  return true // 차단 - 이미 휴가 신청이 있음
}
```

**성능 최적화**:
- Map 기반 휴가 유형 캐싱 (`Map<string, number>`)
- 반복 DB 조회 방지로 응답 속도 개선

### 3. 연차 신청 폼 고도화

**동적 드롭다운 구현** (`/components/leave-request-form-dialog.tsx:48-71`):
- `useEffect`와 `loadLeaveTypes()` 함수로 실시간 휴가 유형 로딩
- 하드코딩된 옵션 제거, 완전 데이터베이스 기반 구성

**유연한 날짜 제한**:
- 기존: `deduction_days === 0.5` (반차만) → 현재: `deduction_days !== 1` (다양한 휴가량 지원)
- 과거 날짜 신청 허용 (취소 후 재신청, 사후 신청 지원)

**UX 개선사항**:
- 휴가 유형별 차감량 표시: "특별휴가 (2일)", "반차 (0.5일)"
- 단일 날짜 휴가 자동 처리: 종료일 비활성화 및 자동 설정
- 상황별 안내 메시지 표시

### 4. 근무표 시스템과의 완전 분리

**연차 보호 메커니즘**:
- 일괄 생성: 연차 날짜 건너뛰기 (`/lib/supabase-work-schedule-storage.ts:336-341`)
- 일괄 삭제: 연차만 선택적 보호 (`/lib/supabase-work-schedule-storage.ts:448-454`)
- 개별 수정: 연차 날짜 편집 차단 (`/components/work-schedule-edit-dialog.tsx:138-149`)

**UI 시각적 분리**:
- 휴가 유형 카드: 파란색 테두리 + "휴가 유형" 배지
- 근무표 연차 일정: "🏖️ 연차 일정" 표시 + 편집 차단 안내
- 드롭다운에서 휴가 유형 자동 제외

### 5. 타입 안전성 및 에러 핸들링

**타입 시스템 강화**:
- `LeaveType`과 `WorkTypeType` 간 일관성 보장
- 데이터베이스 스키마(`Database`)와 완전 동기화
- 모든 CRUD 작업에서 컴파일 타임 타입 검증

**에러 핸들링 개선**:
- 상세한 콘솔 로깅 (개발 디버깅용)
- 사용자 친화적 에러 메시지
- try-catch 기반 안정적 에러 복구

## 📋 원래 PRD 명세 (구현 대상)

### 1. 연차 신청 시스템 (직원)

**접근 경로**: 사이드바 → "연차 신청" (`/leave-request`)

**주요 기능**:
- **동적 연차 유형 선택**: ✅ 데이터베이스에서 실시간 로딩
- **유연한 날짜 설정**: ✅ 1일/비1일 휴가 자동 구분 처리
- **실시간 잔여 연차 확인**: ✅ 현재 보유 연차 실시간 표시
- **자동 유효성 검사**: ✅ 지능형 중복 방지 + 잔여 연차 확인
- **과거 날짜 신청**: ✅ 사후 신청 및 재신청 지원

**UI 구성요소**:
- 연차 잔액 카드: 📋 구현 예정
- 연차 신청 내역: 📋 구현 예정  
- 신청 폼: ✅ 완료

### 2. 연차 승인 관리 (관리자)

**접근 경로**: 사이드바 → "연차 승인" (`/leave-approval`)
**권한**: 관리자만 접근 가능
**상태**: 📋 구현 예정

**주요 기능**:
- **대기중 신청 우선 표시**: 승인 대기 중인 신청을 최우선으로 표시
- **상세 정보 제공**:
  - 신청자 정보 (이름, 팀, 잔여 연차)
  - 신청 내용 (유형, 기간, 사유)
  - 영향도 분석 (근무표 겹침 확인)
- **승인/반려 처리**:
  - 승인: ✅ 자동 연차 차감 + 근무표 반영 + 승인 이력 기록 (스토리지 레벨 구현 완료)
  - 반려: ✅ 반려 사유 입력 + 반려 이력 기록 (스토리지 레벨 구현 완료)

**통계 대시보드**:
- 전체/대기중/승인됨/반려됨/취소됨 신청 수: ✅ 스토리지 레벨 구현 완료
- 연차 사용 현황 종합 분석

### 3. 근무표 연동 시스템 ✅

**자동 연동 프로세스**:
1. **승인 시**: ✅ 해당 날짜에 연차 유형 자동 반영 (`updateWorkScheduleForLeave`)
2. **취소 시**: ✅ 근무표에서 연차 제거 (`removeWorkScheduleForLeave`)
3. **연차 보호**: ✅ 일괄 근무표 생성/삭제 시 연차 우선 보호

**근무표 연동 매핑**: ✅ 동적 매핑 지원
- 모든 휴가 유형 → 해당 `work_type` ID 자동 매핑
- `deduction_days`가 있는 모든 유형에 대한 유연한 처리

### 4. 연차와 근무 유형 완전 분리 ✅

**개별 근무표 수정 시**: ✅ 완료
- 연차 날짜는 수정 버튼 비활성화
- 연차 안내 메시지 표시: "연차 신청이 승인된 일정입니다"
- 연차 유형은 선택 리스트에서 제외

**근무 유형 관리에서**: ✅ 완료
- 연차 유형들을 "휴가 유형" 배지로 구분 표시
- 연차 유형의 시각적 분리 (파란색 테두리 + 배경)
- 차감 연차량 정보 표시

## 기술 구현 세부사항

### 핵심 스토리지 모듈 ✅

**`supabase-leave-request-storage.ts`**: 연차 신청 핵심 로직
- `createLeaveRequest()`: 연차 신청 생성 및 유효성 검사
- `checkDailyLeaveLimit()`: 지능형 중복 방지 시스템
- `approveLeaveRequest()`: 승인 처리 + 연차 차감 + 근무표 반영
- `rejectLeaveRequest()`: 반려 처리 + 사유 기록
- `cancelLeaveRequest()`: 취소 처리 + 연차 복구 + 근무표 원복
- `getLeaveRequestStats()`: 연차 신청 통계 생성

**`supabase-work-schedule-storage.ts`**: 근무표 연동 및 보호
- `bulkCreateSchedule()`: 연차 날짜 보호하는 일괄 생성
- `bulkDeleteSchedule()`: 연차만 선택적 보호하는 일괄 삭제
- `upsertWorkSchedule()` / `deleteWorkSchedule()`: 연차 승인/취소 시 자동 호출

### 주요 컴포넌트 구현 상태

**구현 완료** ✅:
- `LeaveRequestFormDialog`: 동적 휴가 유형 + 지능형 날짜 처리
- `WorkTypeCard`: 휴가 유형 시각적 구분 표시
- `WorkScheduleEditDialog`: 연차 보호 로직 + 편집 차단

**구현 예정** 📋:
- `LeaveApprovalDialog`: 승인/반료 처리 UI
- 연차 잔액 카드 컴포넌트
- 연차 신청 내역 테이블 컴포넌트

## 데이터 모델 ✅

### leave_requests 테이블 (구현 완료)
```sql
- id: UUID (Primary Key)
- member_id: UUID (Foreign Key → members.id)
- member_name: VARCHAR
- team_name: VARCHAR
- leave_type: VARCHAR (동적 휴가 유형 지원)
- start_date: DATE
- end_date: DATE
- total_days: DECIMAL(3,1) (0.5일 단위 지원)
- reason: TEXT
- status: ENUM ('대기중', '승인됨', '반려됨', '취소됨')
- requested_at: TIMESTAMP
- approved_at: TIMESTAMP
- approved_by: VARCHAR
- rejected_reason: TEXT
- cancelled_at: TIMESTAMP
- cancelled_by: VARCHAR
```

### work_types 테이블 확장 ✅
```sql
+ deduction_days: DECIMAL(3,1) NULL (휴가 차감일수, 최소 0.1)
+ is_leave: BOOLEAN DEFAULT false (휴가/근무 유형 명확한 구분)
```

### annual_leave_transactions 정규화 ✅
- `use` 트랜잭션은 grant_date, expire_date 불필요 (reference_id로 부여 참조)
- 데이터 중복 제거로 일관성 향상

## ✅ 구현 완료된 비즈니스 규칙

### 신청 규칙
1. **동적 유형 제한**: `deduction_days !== 1`인 휴가는 단일 날짜만 신청 가능
2. **오프일 보호**: 주간 근무표 "오프" 날짜는 휴가로 덮어쓰지 않고 원본 유지
3. **잔여 연차 확인**: 신청/승인 시점 이중 확인
4. **중복 방지**: 동일 날짜에 여러 휴가 신청 차단 (대기중/승인됨 모두)

### 승인 규칙
1. **실시간 검증**: 승인 시점 잔여 연차 재확인
2. **자동 처리**: 승인 즉시 연차 차감 + 근무표 반영
3. **트랜잭션 기록**: `annual_leave_transactions`에 사용 기록 생성

### 취소 규칙
1. **시점 제한**: 연차 시작일 전까지만 취소 가능
2. **복구 처리**: 차감 연차 복구 + 근무표 제거
3. **상쇄 거래**: 기존 사용을 상쇄하는 양수 거래 생성

### 연차 보호 규칙
1. **일괄 근무표 생성**: `deduction_days`가 있는 날짜 건너뛰기
2. **일괄 근무표 삭제**: 휴가 유형만 선택적 보호
3. **개별 수정 차단**: UI 레벨에서 연차 날짜 편집 방지

## 📋 다음 구현 예정 사항

### 1. 연차 신청 페이지 UI (`/leave-request`)
- 연차 잔액 카드 컴포넌트
- 연차 신청 내역 테이블 (상태별 탭 구성)
- 연차 신청 폼 통합

### 2. 연차 승인 페이지 UI (`/leave-approval`)  
- 대기중 신청 목록 표시
- 연차 승인/반려 다이얼로그
- 연차 신청 통계 대시보드

### 3. 사이드바 네비게이션 추가
- "연차 신청" 메뉴 항목
- "연차 승인" 메뉴 항목 (관리자 전용)

## 🎯 핵심 성취사항 요약

이번 구현을 통해 달성한 주요 기술적 성과:

1. **확장성**: 하드코딩 제거 → 데이터베이스 기반 동적 시스템
2. **데이터 무결성**: 오프일 보호 + 백업/복원 메커니즘으로 근무표 일관성 유지
3. **유연성**: is_leave 플래그로 휴가/근무 유형 명확한 구분
4. **정규화**: use 트랜잭션 중복 필드 제거로 데이터 일관성 향상
5. **안정성**: 타입 안전성 + 에러 핸들링 강화
6. **사용성**: 단순명료한 중복 방지 정책 + 직관적 UX

**기존 연차 정책 엔진과의 완벽 통합**으로 복잡한 연차 규칙을 자동 처리하면서도 사용자 친화적 인터페이스를 제공하는 견고한 기반을 구축했습니다.

## 🔧 최근 주요 개선사항

### V2 연차 관리 시스템 개선
1. **근무표 백업/복원**: 휴가 승인 시 기존 근무 유형 백업, 취소 시 자동 복원
2. **오프일 보호**: 휴가가 오프일을 덮어쓰지 않도록 보호
3. **is_leave 플래그**: work_types 테이블에 명시적 휴가 구분 필드 추가
4. **중복 방지 단순화**: 동일 날짜 다중 휴가 신청 완전 차단
5. **데이터 정규화**: use 트랜잭션에서 중복 필드 제거
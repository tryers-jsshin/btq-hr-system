# BTQ HR 시스템 - Product Requirements Document (PRD)

> 최종 업데이트: 2025-08-13
> **최근 변경사항**: 모바일 우선 UI 전면 리디자인 및 Linear Light 테마 완성 적용

## 1. 시스템 개요

### 1.1 목적
BTQ HR 시스템은 중소기업을 위한 종합적인 인사 관리 솔루션으로, 구성원 관리, 근무 일정, 연차 관리, 근태 관리, 근무 마일리지 등을 통합 관리하는 웹 기반 시스템입니다.

### 1.2 기술 스택
- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Tailwind CSS, Radix UI, shadcn/ui
- **Design System**: Linear Light Theme ([`/docs/theme.md`](./theme.md))
- **Backend**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (커스텀 구현)
- **날짜 처리**: date-fns
- **폼 관리**: React Hook Form, Zod

### 1.3 사용자 역할
- **관리자**: 전체 시스템 관리 권한 (is_admin: true)
- **일반직원**: 개인 정보 조회 및 연차 신청 권한

### 1.4 문서 구조
- **디자인 시스템**: [`/docs/theme.md`](./theme.md)
- **데이터베이스**: [`/docs/database-schema.md`](./database-schema.md)
- **코딩 규칙**: [`/docs/conventions.md`](./conventions.md)

## 2. 데이터베이스 스키마

### 2.1 주요 테이블
- `members`: 구성원 정보 (이름, 팀, 역할, 입사일, 근무 스케줄)
- `teams`: 팀 정보 및 구성원 수
- `leave_requests`: 연차 신청 내역
- `annual_leave_transactions`: 연차 거래 내역 (부여/사용/소멸)
- `annual_leave_balances`: 연차 잔액 현황
- `annual_leave_policies`: 연차 정책 설정
- `work_schedule_entries`: 근무 일정
- `work_types`: 근무 유형 (정규/교대/연차 등)
- `attendance_records`: 근태 기록
- `work_mileage_transactions`: 근무 마일리지 거래
- `termination_logs`: 퇴사/재입사 로그

## 3. 핵심 기능 명세

### 3.1 인증 및 권한 관리

#### 기능 설명
- 이름과 비밀번호 기반 로그인
- 관리자/일반직원 역할 구분
- 세션 기반 인증 유지

#### 주요 프로세스
1. 로그인: 이름/비밀번호 검증 → localStorage 세션 저장
2. 권한 확인: is_admin 필드로 관리자 권한 체크
3. 라우트 보호: 권한별 페이지 접근 제어

#### 관련 파일
- `/lib/supabase-auth-storage.ts`
- `/app/login/page.tsx`
- `/components/route-guard.tsx`

### 3.2 구성원 관리

#### 기능 설명
- 구성원 등록/수정/삭제
- 퇴사 처리 및 재입사 관리
- 팀 배정 및 주간 근무 패턴 설정

#### 비즈니스 규칙
- 퇴사자는 status: 'terminated'로 변경
- 재입사 시 새로운 member_id 생성
- 퇴사 시 연차 자동 소멸 처리

#### 주요 프로세스
1. **신규 등록**: 기본 정보 입력 → 팀 배정 → 연차 자동 부여
2. **퇴사 처리**: 퇴사일/사유 입력 → 연차 소멸 → 상태 변경
3. **재입사**: 기존 정보 참조 → 새 ID 생성 → 연차 재부여

#### 관련 파일
- `/app/members/page.tsx` - **[2025-08-13 전면 리디자인]** 
  - 데스크탑: Linear 테마 적용된 테이블 뷰
  - 모바일: 카드 기반 리스트 뷰 + FAB 버튼
  - 반응형 검색 및 드롭다운 메뉴
- `/app/members/terminated/page.tsx`
- `/lib/supabase-member-storage.ts`
- `/components/member-form-dialog.tsx` - **[2025-08-13 개선]**
  - 주간 스케줄 필수 선택 검증 강화
  - 전화번호 자동 형식화 (010-1234-5678)
  - 모바일 최적화된 다이얼로그 레이아웃

### 3.3 연차 시스템

#### 기능 설명
- FIFO 방식 연차 관리
- 자동 부여 및 소멸 정책
- 신청/승인/반려 워크플로우
- 근무표 자동 연동

#### 연차 정책
- **1년차**: 월 1일 부여 (최대 11일)
- **2년차 이상**: 연 15일 기본 + 2년마다 1일 추가 (최대 25일)
- **소멸 기한**: 부여일로부터 1년

#### 주요 프로세스
1. **연차 신청**
   - 잔액 확인 → 신청서 작성 → 관리자 검토 대기
   - 상태: 대기중 → 승인됨/반려됨/취소됨

2. **연차 승인**
   - 관리자 검토 → 승인/반려 결정
   - 승인 시: 연차 차감 + 근무표 자동 업데이트
   - 반려 시: 사유 기록

3. **연차 취소**
   - 대기중: 신청자 직접 취소 가능
   - 승인됨: 시작일 이전까지 취소 가능 (관리자는 언제나 가능)
   - 취소 시: 연차 복구 + 근무표 원복

#### FIFO 처리
- 가장 오래된 연차부터 우선 사용
- 소멸 예정 연차 자동 추적
- 트랜잭션 기반 이력 관리

#### 관련 파일
- `/app/leave-request/page.tsx` (직원용)
- `/app/leave-approval/page.tsx` (관리자용)
- `/lib/supabase-leave-request-storage.ts`
- `/lib/supabase-annual-leave-storage-v2.ts`
- `/lib/annual-leave-fifo-v2.ts`

### 3.4 근무표 관리

#### 기능 설명
- 월간 근무표 생성/수정/삭제
- 구성원별 주간 패턴 적용
- 연차 신청 자동 반영

#### 주요 프로세스
1. **월간 생성**: 선택 월 → 구성원별 패턴 적용 → 일괄 생성
2. **개별 수정**: 날짜/구성원 선택 → 근무 유형 변경
3. **연차 연동**: 연차 승인 시 자동 업데이트

#### 관련 파일
- `/app/work-schedule/page.tsx`
- `/app/work-schedule/manage/page.tsx`
- `/lib/supabase-work-schedule-storage.ts`

### 3.5 근태 관리

#### 기능 설명
- CSV 파일 업로드를 통한 일괄 등록
- 지각/조기퇴근/초과근무 자동 계산
- 개인별/전체 근태 조회
- 근태 기록 수정/삭제

#### 계산 로직
- **지각**: 예정 출근 시간 + 5분 이후 체크인
- **조기퇴근**: 예정 퇴근 시간 이전 체크아웃
- **초과근무**: 예정 퇴근 시간 이후 체크아웃

#### 주요 프로세스
1. **CSV 업로드**: 파일 선택 → 데이터 파싱 → 검증 → 저장
2. **자동 계산**: 근무표 대조 → 지각/초과 계산 → 마일리지 반영
3. **수정/삭제**: 사유 입력 → 이력 기록 → 마일리지 재계산

#### 관련 파일
- `/app/attendance/my/page.tsx` (개인)
- `/app/attendance/all/page.tsx` (전체)
- `/lib/supabase-attendance-storage.ts`
- `/components/attendance-upload-dialog.tsx`

### 3.6 근무 마일리지

#### 기능 설명
- 근태 기반 자동 마일리지 계산
- 관리자 수동 조정
- 이벤트 소싱 방식 이력 관리

#### 마일리지 규칙
- **초과근무**: +분 단위 적립
- **지각**: -분 단위 차감
- **조기퇴근**: -분 단위 차감
- **관리자 조정**: 수동 가감

#### 이벤트 소싱
- 모든 변경사항을 트랜잭션으로 기록
- 시점별 잔액 추적 가능
- 원천 구분 (attendance/manual/leave 등)

#### 관련 파일
- `/app/mileage/manage/page.tsx`
- `/lib/supabase-work-mileage-storage.ts`
- `/components/mileage-adjust-dialog.tsx`

### 3.7 시스템 설정

#### 근무 유형 관리
- 커스텀 근무 유형 생성
- 시간대 및 색상 설정
- 연차/휴가 유형 구분

#### 연차 정책 설정
- 부여 규칙 커스터마이징
- 소멸 기한 설정
- 정책 활성화/비활성화

#### 비밀번호 변경
- 현재 비밀번호 확인
- 새 비밀번호 설정 (8자 이상)

#### 관련 파일
- `/app/settings/work-types/page.tsx`
- `/app/settings/annual-leave/page.tsx`
- `/app/settings/password/page.tsx`

## 4. 페이지 라우팅 구조

### 공통 접근 가능 (관리자 + 일반직원)
- `/` - 대시보드
- `/login` - 로그인
- `/work-schedule` - 근무표 조회
- `/leave-request` - 연차 신청
- `/attendance/my` - 나의 근태
- `/settings/password` - 비밀번호 변경

### 관리자 전용
- `/members` - 활성 구성원 관리 **[2025-08-13 완전 리디자인]**
  - **데스크탑**: 정보 밀도 최적화된 테이블 뷰
  - **모바일**: 터치 최적화된 카드 리스트 뷰 + FAB
  - **공통**: Linear Light 테마, 통합된 드롭다운 액션
- `/members/terminated` - 퇴사자 관리
- `/teams` - 팀 관리
- `/work-schedule/manage` - 근무표 관리
- `/leave-approval` - 연차 승인
- `/attendance/all` - 전체 근태 관리
- `/mileage/manage` - 근무 마일리지 관리
- `/settings/work-types` - 근무 유형 설정
- `/settings/annual-leave` - 연차 정책 설정

### 개발/테스트 전용 페이지
- `/card-design-preview` - **[개발용]** 구성원 카드 디자인 테스트 페이지
- `/team-design-preview` - **[개발용]** 팀 카드 디자인 테스트 페이지

## 5. 주요 컴포넌트

### 레이아웃 컴포넌트 **[2025-08-13 모바일 최적화 완료]**
- `Sidebar` - 데스크탑 사이드바 네비게이션 (lg:768px+ 표시)
- `MobileNav` - **[신규]** 모바일 전용 Sheet 네비게이션 (햄버거 메뉴)
- `ConditionalLayout` - 반응형 조건부 레이아웃 (lg:768px 기준 자동 전환)
- `RouteGuard` - 라우트 보호 및 인증 검증
- **통합 브레이크포인트**: md:768px를 핵심 기준점으로 활용

### 다이얼로그 컴포넌트 **[2025-08-13 모바일 최적화]**
- `MemberFormDialog` - **[개선됨]** 구성원 등록/수정
  - 모바일 전체 폭 다이얼로그 (`!w-[calc(100%-2rem)]`)
  - 주간 스케줄 시각적 미리보기
  - 전화번호 자동 형식화
  - 팀 선택 필수 검증
- `MemberDetailDialog` - **[개선됨]** 구성원 상세 보기
  - 모바일 최적화된 정보 레이아웃
  - 주간 스케줄 시각화
- `TerminationFormDialog` - 퇴사 처리
- `TerminatedMemberDetailDialog` - **[신규]** 퇴사자 상세 보기
- `TerminationCancelDialog` - **[신규]** 퇴사 취소 다이얼로그
- `LeaveRequestFormDialog` - 연차 신청
- `LeaveApprovalDialog` - 연차 승인/반려
- `AttendanceUploadDialog` - 근태 CSV 업로드
- `AttendanceModifyDialog` - 근태 수정
- `MileageAdjustDialog` - 마일리지 조정
- `WorkScheduleBulkCreateDialog` - 근무표 일괄 생성
- `AnnualLeavePolicyFormDialog` - 연차 정책 설정

### 카드 컴포넌트
- `MemberCard` - 구성원 카드 (구버전, 현재 미사용)
- `TeamCard` - 팀 카드
- `WorkTypeCard` - 근무 유형 카드
- `AnnualLeaveBalanceCard` - 연차 잔액 카드

### 🎨 UI/UX 개선사항 (2025-08-13) **[완전 리디자인 완료]**

#### **모바일 퍼스트 디자인 시스템**
- **통합 브레이크포인트**: md:768px를 핵심 분기점으로 사용
- **모바일 우선 접근법**: 모든 페이지에서 모바일 → 데스크탑 순으로 설계
- **FAB 패턴**: 모든 관리 페이지에 통일된 FAB 버튼 적용

#### **활성 구성원 페이지 (Option 9 Compact Design)**
- **데스크탑 뷰** (`hidden md:block`): 
  - 정보 밀도 최적화된 테이블 (`bg-[#fafbfb]` 헤더)
  - 행별 호버 효과 (`hover:bg-[#f7f8f9]`)
  - 우상단 MoreVertical 드롭다운 메뉴

- **모바일 뷰** (`md:hidden`):
  - 컴팩트 카드 리스트 (`rounded-lg` 카드, `px-3 py-2.5` 패딩)
  - 최소 정보 표시 (이름, 관리자 뱃지, 팀명)
  - 우하단 FAB (`fixed bottom-6 right-6`, `h-14 w-14`)

#### **팀 관리 페이지 리디자인**
- **팀 카드**: 그라데이션 아이콘 (`from-[#5e6ad2] to-[#8b7cf6]`)
- **정보 박스**: `bg-[#fafbfb]` 배경의 멤버 카운트 표시
- **MoreVertical 메뉴**: 아이콘 없는 깔끔한 드롭다운
- **모바일 FAB**: 일관된 스타일과 위치

#### **다이얼로그 시스템 개선**
- **모바일 전체 폭**: `!w-[calc(100%-2rem)]` 적용
- **캘린더 컴포넌트**: Popover + Calendar 조합으로 날짜 선택
- **전화번호 자동 형식화**: 입력 시 `010-1234-5678` 형태로 자동 변환
- **주간 스케줄 미리보기**: 색상 토큰 기반 시각적 표현
- **섹션 구분자**: `w-1 h-4 bg-[#5e6ad2] rounded-full` 인디케이터

#### **네비게이션 시스템**
- **모바일 Sheet**: 좌측에서 슬라이드하는 햄버거 메뉴 (`lg:hidden` 표시)
- **데스크탑 사이드바**: 고정 사이드바 (`hidden lg:flex` 표시)
- **권한 기반 필터링**: 사용자 역할(관리자/일반직원)에 따른 메뉴 자동 필터링
- **사용자 정보**: 프로필 아이콘, 이름, 팀명, 역할 표시
- **계층형 메뉴**: Collapsible 컴포넌트로 구성원 관리, 기본 설정 하위 메뉴
- **브레이크포인트 통합**: lg:1024px 기준으로 사이드바/모바일 네비게이션 전환

#### **Linear Light 테마 완성**
- **색상 체계**: 모든 컴포넌트에서 정의된 색상 토큰만 사용
- **일관된 간격**: theme.md의 spacing scale 준수
- **폰트 통일**: Pretendard 폰트만 사용 (font-mono 금지)
- **접근성**: 44px+ 터치 타겟, focus ring 적용

#### **컴포넌트 라이브러리 통합**
- **Calendar**: shadcn/ui Calendar + Popover 조합
- **Form 검증**: 실시간 유효성 검사 및 시각적 피드백
- **드롭다운**: MoreVertical 아이콘 기반 깔끔한 액션 메뉴
- **Badge**: 역할별 색상 구분 (`bg-[#5e6ad2]` 관리자, `variant="secondary"` 일반)

#### **성능 및 사용성**
- **조건부 렌더링**: `hidden md:block` / `md:hidden` 패턴 활용
- **로딩 상태**: Skeleton UI로 개선된 로딩 경험
- **에러 처리**: Toast 기반 사용자 피드백
- **검색 최적화**: 실시간 필터링 (이름, 사번, 팀 검색)

## 6. 데이터 저장소 모듈

### Supabase Storage 모듈
- `supabase-auth-storage.ts` - 인증 관리
- `supabase-member-storage.ts` - 구성원 데이터
- `supabase-team-storage.ts` - 팀 데이터
- `supabase-leave-request-storage.ts` - 연차 신청
- `supabase-annual-leave-storage-v2.ts` - 연차 관리 (v2)
- `supabase-work-schedule-storage.ts` - 근무표
- `supabase-attendance-storage.ts` - 근태 기록
- `supabase-work-mileage-storage.ts` - 근무 마일리지
- `supabase-work-type-storage.ts` - 근무 유형
- `supabase-termination-storage.ts` - 퇴사 관리

## 7. 보안 및 권한

### 인증
- 세션 기반 인증 (localStorage)
- 비밀번호 해싱 (bcrypt 알고리즘)

### 권한 제어
- 페이지 레벨 권한 체크
- API 레벨 권한 검증
- 역할 기반 접근 제어 (RBAC)

## 8. 성능 최적화

### 데이터 로딩
- 페이지별 필요 데이터만 로드
- 캐싱 전략 적용
- 낙관적 업데이트 (Optimistic UI)

### UI/UX **[2025-08-13 완전 재설계]**
- **모바일 우선 설계**: 모든 페이지에서 모바일 → 데스크탑 순으로 최적화
- **통합 브레이크포인트**: md:768px를 핵심 분기점으로 표준화
- **Linear Light 테마**: 모든 컴포넌트에 일관된 색상 토큰 적용
- **FAB 패턴**: 관리 페이지 공통 FAB 버튼 (`h-14 w-14 rounded-full`)
- **카드 vs 테이블**: 모바일 카드, 데스크탑 테이블로 최적 UX 제공
- **터치 최적화**: 44px+ 터치 타겟, 간격 최적화
- **접근성**: WCAG AA 준수, 키보드 네비게이션, Screen Reader 지원
- **성능 최적화**: 조건부 렌더링, 불필요한 DOM 최소화

## 9. 확장 가능성

### 향후 기능 추가 고려사항
- 급여 관리 시스템 연동
- 보고서 및 통계 기능
- 모바일 앱 개발
- 외부 HR 시스템 연동
- 전자 결재 시스템

## 10. 디자인 시스템 통합

### 10.1 Linear Light 테마 적용
- **색상 시스템**: theme.md 정의된 토큰만 사용
- **타이포그래피**: Pretendard 폰트 전면 적용
- **간격 시스템**: 8px 기준 spacing scale 준수
- **애니메이션**: 100ms 색상 전환, 160ms 일반 전환

### 10.2 반응형 디자인 패턴
- **브레이크포인트**: md:768px를 핵심 분기점으로 사용
- **조건부 표시**: `hidden md:block` / `md:hidden` 패턴
- **레이아웃 전환**: 카드(모바일) ↔ 테이블(데스크탑)
- **네비게이션**: Sheet(모바일) ↔ Sidebar(데스크탑)

### 10.3 컴포넌트 표준화
- **FAB**: 모든 관리 페이지에 통일된 스타일
- **드롭다운**: MoreVertical 기반 액션 메뉴
- **다이얼로그**: 모바일 전체 폭, 데스크탑 제한 폭
- **폼**: 실시간 검증, 시각적 피드백

## 11. 배포 및 유지보수

### 배포 환경
- Vercel 또는 자체 서버
- Supabase Cloud 또는 Self-hosted

### 모니터링
- 에러 로깅
- 사용자 활동 추적
- 성능 메트릭 수집

### 백업
- 데이터베이스 정기 백업
- 트랜잭션 로그 보관
- 재해 복구 계획

## 12. 연차 시스템 UX/UI 혁신 (2025-08-13)

### 12.1 연차 신청 프로세스의 UX/UI 개선사항

#### **연차 신청 페이지 `/leave-request/page.tsx`**
- **그라데이션 브랜드 컬러 잔액 카드** (`from-[#5e6ad2] to-[#8b7cf6]`)
- **반응형 2단 컬럼 레이아웃** (모바일: 1단, 데스크톱: 2단)
- **연차 유형별 색상 코딩된 Badge 시스템** (연차: `#2563eb`, 반차: `#7c3aed` 등)
- **상태별 필터링** (모바일: 드롭다운, 데스크톱: 버튼 그룹)

#### **연차 신청 다이얼로그 `/components/leave-request-form-dialog.tsx`**
- **날짜 선택 혁신**: HTML native input → Popover + Calendar 완전 전환
- **실시간 계산 시스템**: 선택 기간의 실제 연차 차감 일수 즉시 계산
- **근무표 연동**: 미등록 날짜 실시간 감지 및 관리자 요청 안내
- **휴무일 제외**: 연차 차감에서 휴무일 자동 제외 로직
- **모바일 최적화**: 전체 폭 다이얼로그, 2줄→1줄 버튼 배치 개선
- **Linear Light 테마**: 모든 색상을 브랜드 토큰으로 완전 통일

#### **연차 정책 안내 다이얼로그 `/components/annual-leave-policy-view-dialog.tsx`**
- **Linear Light 테마 완전 적용** (모든 색상을 브랜드 토큰화)
- **깔끔한 디자인**: 라운드 아이콘 제거로 깔끔한 레이아웃 구현
- **카드 색상 통일** (`bg-white border-[#f3f4f6]`)
- **실제 예시 추가**로 정책 이해도 향상
- **DialogHeader 레이아웃 개선**으로 X 버튼 위치 최적화

### 12.2 모바일 우선 반응형 설계

#### **모바일 다이얼로그 최적화**
- 전체 폭 활용: `!w-[calc(100%-2rem)]`
- 최대 높이 스크롤: `max-h-[90vh] overflow-y-auto`
- 버튼 레이아웃: 2줄→1줄 변경 (`flex-1` 적용)

#### **터치 최적화 인터페이스**
- 캘린더 컴포넌트: 터치 친화적 날짜 선택
- Popover 자동 닫기: 날짜 선택 시 자동 닫힘
- 최소 터치 영역 44px 보장

#### **Linear Light 테마 일관성**
- 모든 색상을 정의된 브랜드 토큰으로 통일
- 하드코딩된 색상 완전 제거
- 일관된 간격 시스템 적용

### 12.3 기술적 혁신

#### **실시간 연차 계산 시스템**
- **근무표 기반 정확한 계산**: 선택 기간의 실제 근무일만 연차 차감
- **휴무일 자동 인식**: `is_holiday: true` 근무 유형은 연차 차감에서 제외
- **미등록 날짜 감지**: 근무표 미등록 날짜 실시간 감지 및 경고
- **반차 처리**: deduction_days 값에 따른 정확한 차감 일수 계산

#### **사용자 경험 개선**
- **즉시 피드백**: 날짜 선택 시 연차 사용 일수 즉시 표시
- **오류 방지**: 잔여 연차 부족 시 신청 버튼 비활성화
- **명확한 안내**: 근무표 미등록 시 관리자 요청 안내 메시지

#### **캘린더 컴포넌트 표준화**
- **한국어 로케일 적용**: `yyyy년 M월 d일` 형식으로 자연스러운 날짜 표시
- **실시간 유효성 검사**: 시작일 선택 시 종료일 범위 자동 제한
- **터치 최적화**: 모바일에서도 편리한 날짜 선택 경험

### 12.4 상태 표시 시스템

#### **연차 유형별 Badge 색상 표준화**
```typescript
const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
  "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  "특별휴가": "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  "병가": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "경조휴가": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]"
}
```

#### **신청 상태별 텍스트 색상 통일**
- 대기중: `text-[#ea580c]` (주황)
- 승인됨: `text-[#16a34a]` (녹색)
- 반려됨: `text-[#dc2626]` (빨강)
- 취소됨: `text-[#64748b]` (회색)

### 12.5 성과 및 개선점

#### **사용자 경험 개선**
- 연차 신청 과정에서 발생할 수 있는 오류 사전 방지
- 근무표와 연동된 정확한 연차 계산으로 관리 효율성 향상
- 직관적인 날짜 선택으로 사용 편의성 대폭 개선

#### **관리 효율성 향상**
- 근무표 미등록 날짜 사전 감지로 관리자 업무 효율화
- 휴무일 자동 제외로 정확한 연차 관리
- 실시간 계산으로 잘못된 신청 방지

#### **디자인 시스템 완성도**
- Linear Light 테마의 완전한 적용
- 모바일 우선 설계의 완성
- 브랜드 일관성 확보

## 13. Version History

### v2.2.0 (2025-08-13) - 연차 신청 시스템 UX/UI 혁신
- **연차 신청 다이얼로그 완전 재구성**:
  - HTML native input → Popover + Calendar 컴포넌트 전환
  - 실시간 연차 사용 일수 계산 시스템 구현
  - 근무표 연동 검증 및 미등록 날짜 경고 기능
  - 휴무일 자동 제외 로직 구현
  - 모바일 최적화된 다이얼로그 레이아웃
- **연차 정책 안내 다이얼로그 리디자인**:
  - Linear Light 테마 완전 적용 (모든 색상 브랜드 토큰화)
  - 라운드 아이콘 제거 및 카드 색상 통일
  - 실제 적용 예시 추가로 정책 이해도 향상
  - DialogHeader 레이아웃 개선
- **연차 신청 페이지 UX 개선**:
  - 그라데이션 브랜드 컬러 잔액 카드
  - 반응형 2단 컬럼 레이아웃 최적화
  - 연차 유형별 색상 코딩된 Badge 시스템
  - 상태별 필터링 (모바일: 드롭다운, 데스크톱: 버튼)

### v2.1.0 (2025-08-13) - Mobile-First Redesign
- **모바일 우선 설계**: 모든 컴포넌트를 모바일 기준으로 재설계
- **통합 브레이크포인트**: md:768px를 핵심 분기점으로 표준화
- **FAB 패턴 도입**: 모바일 관리 페이지 통일된 FAB 버튼
- **컴팩트 카드**: Option 9 디자인으로 모바일 카드 최적화
- **드롭다운 메뉴**: MoreVertical 기반 아이콘 없는 깔끔한 메뉴
- **캘린더 컴포넌트**: Popover + Calendar 조합 표준화
- **다이얼로그 모바일 최적화**: 전체 폭 활용 및 스크롤 개선
# Theme Specification (Linear Light — Unified & Mobile Optimized)

**Version:** 2.0.0-light  
**Last Updated:** 2025-01-13
**Theme Mode:** **Light Theme Only (다크 테마 미사용)**

---

## 0) Design Principles
- 깔끔하고 미니멀한 라이트 디자인
- 높은 대비와 가독성 유지
- 일관된 간격 시스템
- 부드러운 애니메이션
- 웹 접근성 준수
- 모바일 퍼스트 접근

> 이 문서는 **디자인 토큰(Design Tokens)**을 단일 참고서로 통합합니다. CSS 변수, Tailwind config, 컴포넌트 스타일 가이드를 이 문서 기준으로 일관 반영하세요.

---

## 1) Brand
- **Name**: Linear
- **Primary Font**: Pretendard (필수)
- **Font Stack**: Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif

> **중요**: 프로젝트 전체에서 모든 폰트는 반드시 Pretendard를 사용해야 합니다. 다른 폰트 사용 금지. 특히 font-mono 클래스 사용 금지.

---

## 2) Colors

### 2.1 Background
| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#ffffff` | 메인 배경 |
| `--bg-secondary` | `#fafbfb` | 섹션 배경, 정보 박스 |
| `--bg-card` | `#f7f8f9` | 카드 호버 상태 |
| `--bg-surface` | `#f1f3f4` | 비활성 상태 |

### 2.2 Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#0a0b0c` | 제목, 중요 텍스트 |
| `--text-secondary` | `#4a5568` | 본문, 일반 텍스트 |
| `--text-muted` | `#718096` | 보조 텍스트, 플레이스홀더 |

### 2.3 Brand
| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#5e6ad2` | 주요 버튼, 링크, 포커스 |
| `--brand-primary-hover` | `#4e5ac2` | 호버 상태 |
| `--brand-secondary` | `#00b8cc` | 보조 액션 |
| `--brand-accent` | `#8b7cf6` | 강조 요소 |

### 2.4 Status
| Token | Value | Usage |
|---|---|---|
| `--status-success` | `#059669` | 성공 상태 |
| `--status-warning` | `#d97706` | 경고 상태 |
| `--status-error` | `#dc2626` | 오류 상태 |
| `--status-danger` | `#ef4444` | 위험 액션 (퇴사 등) |
| `--status-danger-hover` | `#dc2626` | 위험 액션 호버 |
| `--status-info` | `#2563eb` | 정보 제공 |

### 2.5 Semantic Colors
| Token | Value | Usage |
|---|---|---|
| `--border-default` | `#f3f4f6` | 기본 테두리 |
| `--border-hover` | `#e5e7eb` | 호버 테두리 |
| `--focus-ring` | `#5e6ad2` | 포커스 링 |

### 2.6 Gray Scale
50:#f9fafb, 100:#f3f4f6, 200:#e5e7eb, 300:#d1d5db, 400:#9ca3af, 500:#6b7280, 600:#4b5563, 700:#374151, 800:#1f2937, 900:#111827, 950:#030712

---

## 3) Typography

### 3.1 Font Family
- **Primary**: Pretendard (모든 텍스트에 필수 적용)
- **Monospace 금지**: font-mono 클래스 사용 금지, 모든 텍스트는 Pretendard 사용

### 3.2 Font Sizes
| Token | Size | Usage |
|---|---|---|
| `xs` | 10px | 라벨, 캡션 |
| `sm` | 13px | 보조 텍스트 |
| `base` | 14px | 본문 기본 |
| `md` | 15px | 강조 본문 |
| `lg` | 16px | 서브헤딩 |
| `xl` | 17px | 헤딩 |
| `2xl` | 21px | 페이지 타이틀 (모바일) |
| `3xl` | 24px | 페이지 타이틀 (데스크톱) |

### 3.3 Font Weights
| Token | Weight | Usage |
|---|---|---|
| `normal` | 400 | 본문 |
| `medium` | 500 | 강조 텍스트 |
| `semibold` | 600 | 서브헤딩 |
| `bold` | 700 | 헤딩 |

### 3.4 Line Heights
| Token | Value | Usage |
|---|---|---|
| `tight` | 1.2 | 헤딩 |
| `normal` | 1.5 | 본문 |
| `relaxed` | 1.6 | 긴 텍스트 |

---

## 4) Spacing Scale
0:0px, 1:2px, 2:4px, 3:6px, 4:8px, 5:10px, 6:12px, 7:14px, 8:16px, 10:20px, 12:24px, 16:32px, 20:48px, 24:56px, 32:64px, 40:80px, 48:96px, 64:160px, 80:280px, px:1px

### 4.1 Common Patterns
- **Dialog Padding**: `py-4` (상하), `space-y-6` (섹션 간격)
- **Card Padding**: `p-4` (16px)
- **Button Padding**: `px-3 sm:px-4` (반응형)
- **Section Margin**: `mb-6 sm:mb-8` (반응형)

---

## 5) Border Radius
| Token | Value | Usage |
|---|---|---|
| `none` | 0px | 사용 안 함 |
| `sm` | 4px | 작은 요소 |
| `base` | 6px | 입력 필드 |
| `md` | 8px | 카드 |
| `lg` | 10px | 큰 카드 |
| `xl` | 16px | 다이얼로그, 모달 |
| `2xl` | 18px | 특수 요소 |
| `full` | 9999px | 원형 버튼, 뱃지 |

---

## 6) Shadows
| Token | Value | Usage |
|---|---|---|
| `sm` | rgba(0, 0, 0, 0.05) 0px 1px 2px 0px | 카드 |
| `base` | rgba(0, 0, 0, 0.1) 0px 4px 6px -1px | 드롭다운 |
| `lg` | rgba(0, 0, 0, 0.1) 0px 10px 15px -3px | 다이얼로그 |
| `xl` | rgba(0, 0, 0, 0.1) 0px 20px 25px -5px | 모달 |

---

## 7) Layout

### 7.1 Container
- **Max Width**: `max-w-7xl` (1280px)
- **Padding**: `px-4 sm:px-6 lg:px-8`
- **Vertical Padding**: `py-4 sm:py-8`

### 7.2 Breakpoints
| Token | Size | Usage |
|---|---|---|
| `sm` | 640px | 모바일 → 태블릿 |
| `md` | 768px | 태블릿 → 데스크톱 |
| `lg` | 1024px | 데스크톱 |
| `xl` | 1280px | 와이드 스크린 |

### 7.3 Responsive Patterns
- **모바일 우선**: 기본 스타일은 모바일, 미디어 쿼리로 확장
- **조건부 표시**: `hidden sm:flex` (모바일 숨김, 데스크톱 표시)
- **반응형 간격**: `mb-6 sm:mb-8`

---

## 8) Components Design Patterns

### 8.1 Dialog
```css
/* 컨테이너 */
- rounded-xl (border-radius: 16px)
- max-w-[500px] ~ max-w-[550px] (일반)
- max-w-2xl (큰 다이얼로그)
- !w-[calc(100%-2rem)] (모바일 전체 폭)
- max-h-[90vh] overflow-y-auto (스크롤)

/* 헤더 */
- text-left (좌측 정렬)
- DialogTitle만 사용 (설명 텍스트 제거)
- text-[#0a0b0c] (타이틀 색상)
- 간결한 제목 (아이콘 제거)

/* 콘텐츠 */
- space-y-6 py-4 (섹션 간격)
- 섹션 헤더: w-1 h-4 bg-[#5e6ad2] rounded-full (인디케이터)

/* 푸터 */
- gap-2 sm:gap-0 (버튼 간격)
- 취소: border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]
- 확인: bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white
```

### 8.2 Table (Desktop)
```css
/* 컨테이너 */
- hidden md:block (모바일 숨김)
- bg-white rounded-lg border border-[#f3f4f6]

/* 헤더 */
- bg-[#fafbfb] (배경)
- text-xs font-semibold text-[#4a5568] uppercase
- px-6 py-3 (패딩)

/* 바디 */
- hover:bg-[#f7f8f9] (행 호버)
- divide-y divide-[#f3f4f6] (구분선)
- text-sm (폰트 크기)
```

### 8.3 Card (Mobile)
```css
/* 컨테이너 */
- md:hidden (데스크톱 숨김)
- bg-white rounded-xl
- border border-[#f3f4f6]
- px-4 py-4 (패딩)

/* 레이아웃 */
- space-y-2 (아이템 간격)
- flex justify-between (좌우 정렬)
```

### 8.4 Button
```css
/* Primary */
- bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white
- rounded-md
- h-9 sm:h-10 (반응형 높이)
- px-3 sm:px-4 (반응형 패딩)

/* Danger */
- bg-red-600 hover:bg-red-700 text-white

/* Outline */
- border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]

/* Ghost */
- hover:bg-[#f3f4f6]
- h-8 w-8 p-0 (아이콘 버튼)

/* FAB (모바일) */
- h-14 w-14 rounded-full
- fixed bottom-6 right-6 z-50
- shadow-lg
```

### 8.5 Form Elements
```css
/* Input/Textarea */
- bg-white border-[#f3f4f6]
- focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]
- placeholder:text-[#718096]
- text-sm

/* Label */
- text-sm font-medium text-[#0a0b0c]
- 필수 표시: <span class="text-red-500">*</span>

/* Error */
- text-xs text-red-500
- border-red-500 (에러 상태)
```

### 8.6 Badge
```css
/* Default */
- text-xs px-2 py-0.5 rounded-full

/* Variants */
- 관리자: bg-[#5e6ad2] text-white
- 일반: bg-gray-100 text-gray-700
- 퇴사: border-red-200 text-red-700 bg-red-50
```

### 8.7 Info Box
```css
/* 기본 정보 박스 */
- bg-[#fafbfb] rounded-lg p-4
- space-y-3 또는 space-y-2

/* 경고 박스 */
- bg-amber-50 border border-amber-200
- text-amber-800

/* 위험 박스 */
- bg-red-50 border border-red-100
- text-red-700/900

/* 정보 구조 */
- flex justify-between text-sm (좌우 정렬)
- 왼쪽: text-[#718096] (라벨)
- 오른쪽: text-[#0a0b0c] (값)
```

### 8.8 Empty State
```css
/* 컨테이너 */
- text-center py-12

/* 아이콘 */
- h-12 w-12 text-[#718096] mx-auto mb-4

/* 텍스트 */
- text-[#4a5568] (메인 메시지)
- text-sm text-[#718096] mt-2 (보조 메시지)
```

---

## 9) Animation & Transitions

### 9.1 Duration
- **fast**: 100ms (색상, 배경)
- **normal**: 160ms (일반 전환)
- **slow**: 200ms (복잡한 전환)

### 9.2 Easing
- **default**: ease-in-out
- **spring**: cubic-bezier(0.25, 0.46, 0.45, 0.94)

### 9.3 Common Transitions
```css
/* 색상 전환 */
transition-colors duration-100

/* 모든 속성 */
transition-all duration-160

/* 호버 효과 */
hover:bg-[#f7f8f9] transition-colors duration-100
```

---

## 10) Accessibility

### 10.1 Focus States
- **Focus Ring**: `focus:ring-1 focus:ring-[#5e6ad2] focus:border-[#5e6ad2]`
- **Focus Visible**: 키보드 네비게이션 시에만 표시

### 10.2 Touch Targets
- **최소 크기**: 44px (모바일)
- **버튼 높이**: `h-9 sm:h-10` (36px → 40px)

### 10.3 Screen Reader
- **SR Only**: `<span className="sr-only">Actions</span>`
- **ARIA Labels**: 적절한 aria-label 사용

---

## 11) Mobile Optimization

### 11.1 Layout Switching
- **테이블 → 카드**: `hidden md:block` (테이블), `md:hidden` (카드)
- **상단 버튼 → FAB**: 모바일에서 FAB만 표시

### 11.2 Touch Optimization
- **버튼 크기**: 최소 44px
- **간격**: 충분한 터치 영역 확보
- **스와이프**: Sheet 기반 네비게이션

### 11.3 Content Priority
- **모바일**: 핵심 정보만 표시
- **데스크톱**: 전체 정보 표시

---

## 12) Best Practices

### 12.1 일관성 원칙
1. **색상**: 하드코딩 금지, 정의된 토큰만 사용
2. **폰트**: Pretendard만 사용, font-mono 금지
3. **간격**: 정의된 spacing scale 사용
4. **반경**: rounded-xl (다이얼로그), rounded-lg (카드)

### 12.2 성능 최적화
1. **조건부 렌더링**: 불필요한 DOM 요소 최소화
2. **반응형 이미지**: 적절한 크기 제공
3. **애니메이션**: GPU 가속 속성 사용

### 12.3 접근성
1. **색상 대비**: WCAG AA 기준 충족
2. **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
3. **스크린 리더**: 의미 있는 레이블 제공

### 12.4 반응형 디자인
1. **모바일 우선**: 기본 스타일은 모바일 기준
2. **브레이크포인트**: sm(640px), md(768px) 활용
3. **조건부 표시**: 디바이스별 최적화된 UI

---

## 13) Component Library Integration

### 13.1 shadcn/ui
- 기본 스타일 오버라이드
- Linear Light 테마 적용
- 커스텀 variant 추가

### 13.2 Radix UI
- 프리미티브 컴포넌트 활용
- 접근성 기능 유지
- 스타일링 커스터마이징

---

## 14) Version History

### v2.2.0 (2025-08-13) - 연차 신청 시스템 UI/UX 혁신
- **연차 유형별 Badge 색상 시스템**:
  - 연차: `bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]`
  - 오전반차: `bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]`
  - 오후반차: `bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]`
  - 특별휴가: `bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]`
  - 병가: `bg-[#fef2f2] text-[#dc2626] border-[#fecaca]`
  - 경조휴가: `bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]`
- **상태별 텍스트 색상 지정**:
  - 대기중: `text-[#ea580c]` (주황)
  - 승인됨: `text-[#16a34a]` (녹색)
  - 반려됨: `text-[#dc2626]` (빨강)
  - 취소됨: `text-[#64748b]` (회색)
- **그라데이션 잔액 카드**: `from-[#5e6ad2] to-[#8b7cf6]` 브랜드 컬러 그라데이션
- **캘린더 컴포넌트 최적화**:
  - 한국어 로케일 (`yyyy년 M월 d일` 형식)
  - 터치 최적화된 날짜 선택 UI
  - Popover 자동 닫기 기능
- **다이얼로그 완전 모바일 최적화**:
  - 연차 신청: `!w-[calc(100%-2rem)]` 전체 폭 활용
  - 연차 정책 안내: 라운드 아이콘 제거, 카드 색상 통일
  - 모바일 버튼 레이아웃: `flex-1` 규칙 적용으로 1줄 배치

### v2.1.0 (2025-08-13) - Mobile-First Redesign
- **모바일 우선 설계**: 모든 컴포넌트를 모바일 기준으로 재설계
- **통합 브레이크포인트**: md:768px를 핵심 분기점으로 표준화
- **FAB 패턴 도입**: 모바일 관리 페이지 통일된 FAB 버튼
- **컴팩트 카드**: Option 9 디자인으로 모바일 카드 최적화
- **드롭다운 메뉴**: MoreVertical 기반 아이콘 없는 깔끔한 메뉴
- **캘린더 컴포넌트**: Popover + Calendar 조합 표준화
- **다이얼로그 모바일 최적화**: 전체 폭 활용 및 스크롤 개선

### v2.0.0 (2025-01-13)
- 전체 디자인 시스템 통합
- 다이얼로그 헤더 규칙 표준화
- font-mono 사용 금지 명시
- 컴포넌트별 상세 스펙 추가
- 반응형 패턴 문서화

### v1.0.0 (2025-01-12)
- 초기 Linear Light 테마 정의
- 기본 디자인 토큰 설정
# 코딩 컨벤션

## 📁 파일 구조

### 디렉토리 구조
```
src/
├── app/                    # Next.js App Router 페이지
│   ├── (auth)/            # 인증 관련 페이지
│   ├── members/           # 구성원 관리
│   ├── attendance/        # 근태 관리
│   ├── leave-request/     # 연차 신청
│   └── settings/          # 설정
├── components/            # 재사용 가능한 컴포넌트
│   ├── ui/               # 기본 UI 컴포넌트
│   └── [feature]/        # 기능별 컴포넌트
├── lib/                   # 유틸리티 및 라이브러리
│   ├── supabase*.ts      # Supabase 저장소 모듈
│   └── utils.ts          # 공통 유틸리티
├── hooks/                 # 커스텀 React 훅
├── types/                 # TypeScript 타입 정의
└── styles/               # 전역 스타일
```

## 🎨 스타일링 규칙

### 1. 테마 토큰 사용
```tsx
// ❌ Bad - 하드코딩
<div className="bg-blue-500 text-white p-4">

// ✅ Good - Linear 테마 색상 직접 사용
<div className="bg-[#5e6ad2] text-white p-4">

// ✅ Better - CSS 변수 (준비 시)
<div className="bg-brand-primary text-white p-4">
```

### 2. Linear Light 테마 색상 ([`/docs/theme.md`](./theme.md) 참조)
- **Primary**: `#5e6ad2` (브랜드 컬러)
- **Background**: 
  - Primary: `#ffffff`
  - Secondary: `#fafbfb`
  - Card: `#f7f8f9`
  - Surface: `#f1f3f4`
- **Text**: 
  - Primary: `#0a0b0c`
  - Secondary: `#4a5568`
  - Muted: `#718096`
- **Border**: `#f3f4f6`
- **Status**:
  - Success: `#059669`
  - Warning: `#d97706`
  - Error: `#dc2626`
  - Info: `#2563eb`

### 3. 실제 사용 예시 (활성 구성원 페이지)
```tsx
// 테이블 헤더
<tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">

// 호버 효과
<tr className="hover:bg-[#f7f8f9] transition-colors duration-100">

// 프라이머리 버튼
<Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">

// 텍스트 계층
<h1 className="text-[#0a0b0c]">제목</h1>
<p className="text-[#4a5568]">본문</p>
<span className="text-[#718096]">보조 텍스트</span>
```

### 4. 간격 시스템
- 기본 단위: 4px, 8px, 16px, 24px, 32px
- 패딩: `p-4` (16px), `p-6` (24px)
- 마진: `space-y-4`, `gap-4`

### 5. 폰트 시스템
- **필수 폰트**: Pretendard (모든 텍스트에 적용)
- **금지사항**: 다른 폰트 패밀리 사용 금지
- **폰트 스택**: `font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

## 💻 TypeScript

### 1. 타입 정의
```typescript
// ✅ Good - Database 타입 활용
import type { Database } from "@/types/database"
type Member = Database["public"]["Tables"]["members"]["Row"]

// ❌ Bad - 중복 타입 정의
interface Member {
  id: string
  name: string
  // ...
}
```

### 2. 컴포넌트 Props
```typescript
// ✅ Good - 명시적 타입
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  children: React.ReactNode
}

export function Button({ variant = "primary", ...props }: ButtonProps) {
  // ...
}
```

## 🧩 컴포넌트 규칙

### 1. 네이밍
- 컴포넌트: PascalCase (`MemberCard.tsx`)
- 훅: camelCase + use 접두사 (`useAuth.ts`)
- 유틸리티: camelCase (`formatDate.ts`)
- 상수: UPPER_SNAKE_CASE (`MAX_ITEMS`)

### 2. 컴포넌트 구조
```tsx
// 1. Imports
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

// 2. Types
interface Props {
  // ...
}

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // 3.1 State
  const [state, setState] = useState()
  
  // 3.2 Hooks
  useEffect(() => {}, [])
  
  // 3.3 Handlers
  const handleClick = () => {}
  
  // 3.4 Render
  return <div>...</div>
}
```

### 3. 상태 관리
```typescript
// ✅ Good - 로컬 상태
const [isOpen, setIsOpen] = useState(false)

// ✅ Good - 복잡한 상태는 reducer
const [state, dispatch] = useReducer(reducer, initialState)
```

## 🔄 비동기 처리

### 1. 데이터 로딩
```typescript
// ✅ Good - 로딩/에러 상태 처리
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchData()
      setData(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])
```

### 2. Toast 사용
```typescript
// ✅ Good - 사용자 피드백
const { toast } = useToast()

const handleSave = async () => {
  try {
    await saveData()
    toast({
      title: "저장 완료",
      description: "성공적으로 저장되었습니다."
    })
  } catch (error) {
    toast({
      title: "오류",
      description: "저장 중 오류가 발생했습니다.",
      variant: "destructive"
    })
  }
}
```

## 📝 주석 규칙

### 1. 주석 최소화
```typescript
// ❌ Bad - 불필요한 주석
// 버튼 클릭 핸들러
const handleClick = () => {
  // 상태를 true로 설정
  setIsOpen(true)
}

// ✅ Good - 복잡한 로직만 설명
// FIFO 방식으로 가장 오래된 연차부터 차감
const deductLeave = () => {
  // ...
}
```

### 2. TODO 주석
```typescript
// TODO: 성능 최적화 필요 (가상 스크롤링)
// FIXME: 타입 에러 수정 필요
// NOTE: Supabase RLS 정책 확인 필요
```

## 🚀 성능 최적화

### 1. 메모이제이션
```typescript
// ✅ Good - 비용이 큰 계산
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// ✅ Good - 참조 동일성 유지
const handleClick = useCallback(() => {
  // ...
}, [dependency])
```

### 2. 컴포넌트 분할
```typescript
// ✅ Good - 재렌더링 최소화
const MemberList = memo(({ members }) => {
  return members.map(member => <MemberCard key={member.id} />)
})
```

## 🔒 보안

### 1. 입력 검증
```typescript
// ✅ Good - Zod 스키마 검증
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
```

### 2. 민감 정보
```typescript
// ❌ Bad
console.log("Password:", password)

// ✅ Good
console.log("Login attempt for user:", email)
```

## 🧪 테스트

### 1. 컴포넌트 테스트
```typescript
// ComponentName.test.tsx
describe("ComponentName", () => {
  it("should render correctly", () => {
    // ...
  })
  
  it("should handle click event", () => {
    // ...
  })
})
```

### 2. 유틸리티 테스트
```typescript
// utils.test.ts
describe("formatDate", () => {
  it("should format date correctly", () => {
    expect(formatDate("2024-01-01")).toBe("2024년 1월 1일")
  })
})
```

## 📚 Import 순서

```typescript
// 1. React/Next.js
import { useState } from "react"
import { useRouter } from "next/navigation"

// 2. 외부 라이브러리
import { format } from "date-fns"
import { z } from "zod"

// 3. 내부 컴포넌트
import { Button } from "@/components/ui/button"
import { MemberCard } from "@/components/member-card"

// 4. 유틸리티/훅
import { useAuth } from "@/hooks/use-auth"
import { formatDate } from "@/lib/utils"

// 5. 타입
import type { Database } from "@/types/database"

// 6. 스타일
import styles from "./Component.module.css"
```

## 📱 모바일 우선 디자인 **[2025-08-13 완전 구현]**

### 기본 원칙
1. **모바일 퍼스트**: 375px~430px 기준 최적화
2. **반응형 브레이크포인트**: `md:` (768px) 이상에서 데스크톱
3. **터치 영역**: 최소 44px 보장
4. **FAB 버튼**: 모바일 전용 56px 원형 버튼

### 주요 패턴
```tsx
// 반응형 레이아웃
<div className="block md:hidden">  // 모바일 전용
<div className="hidden md:block"> // 데스크톱 전용

// 모바일 다이얼로그
<DialogContent className="!w-[calc(100%-2rem)] sm:!w-full">

// 모바일 FAB
<div className="md:hidden fixed bottom-6 right-6 z-50">
  <Button className="h-14 w-14 rounded-full">
</div>

// 그리드 시스템
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
```

## ✅ 체크리스트 **[2025-08-13 업데이트]**

커밋 전 필수 확인사항:
- [ ] **TypeScript**: 타입 에러 없음
- [ ] **Linting**: ESLint 경고 없음
- [ ] **테마**: Linear Light 테마 색상만 사용 (하드코딩 금지)
- [ ] **UX**: 로딩/에러/빈 상태 처리
- [ ] **모바일**: 반응형 디자인 작동 확인
  - [ ] 375px 최소 폭에서 정상 동작
  - [ ] FAB 버튼 위치 및 크기 적절
  - [ ] 다이얼로그 모바일 전체 폭 사용
  - [ ] 터치 영역 44px+ 보장
- [ ] **연차 시스템 특화 검증** **[2025-08-13 추가]**:
  - [ ] 캘린더 컴포넌트 정상 동작 (Popover + Calendar)
  - [ ] 한국어 날짜 형식 표시 (`yyyy년 M월 d일`)
  - [ ] 실시간 연차 계산 기능 작동
  - [ ] 근무표 미등록 날짜 경고 시스템
  - [ ] 휴무일 자동 제외 로직 검증
  - [ ] 연차 유형별 Badge 색상 정확성
  - [ ] 상태별 텍스트 색상 일관성
- [ ] **깨끗한 코드**: 불필요한 console.log 제거
- [ ] **보안**: 민감 정보 로깅 없음
- [ ] **접근성**: ARIA 레이블, 키보드 네비게이션 지원
- [ ] **성능**: 불필요한 리렌더링 방지 (메모이제이션 효과적 활용)

## 🔄 연차 시스템 개발 가이드라인 **[2025-08-13 신규]**

### 날짜 처리 규칙
```typescript
// ✅ Good - 한국어 로케일 사용
import { format } from "date-fns"
import { ko } from "date-fns/locale"

const formatDate = (date: Date) => format(date, "yyyy년 M월 d일", { locale: ko })

// ❌ Bad - 영어 로케일 사용
const formatDate = (date: Date) => format(date, "MMM dd, yyyy")
```

### 연차 계산 로직
```typescript
// ✅ Good - 근무표 기반 정확한 계산
const calculateLeaveDays = async (startDate: string, endDate: string) => {
  // 1. 근무표 조회
  const scheduleEntries = await getWorkSchedule(memberId, startDate, endDate)
  
  // 2. 휴무일 제외
  return scheduleEntries.filter(entry => !entry.is_holiday).length
}

// ❌ Bad - 단순 날짜 차이 계산
const calculateLeaveDays = (startDate: string, endDate: string) => {
  return (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1
}
```

### 색상 사용 규칙
```typescript
// ✅ Good - 테마 토큰 사용
const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]"
}

// ❌ Bad - 하드코딩
const leaveTypeColors = {
  "연차": "bg-blue-100 text-blue-600",
  "반차": "bg-purple-100 text-purple-600"
}
```

### 다이얼로그 모바일 최적화
```tsx
// ✅ Good - 모바일 전체 폭 활용
<DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[425px]">

// ✅ Good - 반응형 버튼 레이아웃
<DialogFooter className="!flex !flex-row gap-2">
  <Button className="flex-1" variant="outline">취소</Button>
  <Button className="flex-1">확인</Button>
</DialogFooter>

// ❌ Bad - 고정 너비
<DialogContent className="w-[425px]">
```

### 실시간 계산 구현
```typescript
// ✅ Good - useEffect로 실시간 계산
useEffect(() => {
  const updateCalculatedDays = async () => {
    if (formData.start_date && formData.end_date) {
      setIsCalculating(true)
      const days = await calculateLeaveDays(formData.start_date, formData.end_date)
      setCalculatedDays(days)
      setIsCalculating(false)
    }
  }
  
  updateCalculatedDays()
}, [formData.start_date, formData.end_date, formData.leave_type])

// ❌ Bad - 수동 계산
const handleSubmit = async () => {
  const days = await calculateLeaveDays(formData.start_date, formData.end_date)
  // 제출 시에만 계산
}
```

## 📱 모바일 우선 패턴 **[2025-08-13 연차 시스템 특화]**

### 레이아웃 전환 패턴
```tsx
// 연차 신청 페이지 - 1단/3단 그리드 전환
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  
// 필터 시스템 - 드롭다운/버튼 그룹 전환
<div className="sm:hidden"> {/* 모바일 드롭다운 */}
  <select>{/* 상태 필터 */}</select>
</div>
<div className="hidden sm:flex gap-2"> {/* 데스크톱 버튼 */}
  <Button size="sm">{/* 필터 버튼들 */}</Button>
</div>
```

### 터치 최적화
```tsx
// ✅ Good - 충분한 터치 영역
<Button className="h-12 md:h-10 lg:h-12"> {/* 반응형 높이 */}

// ✅ Good - 캘린더 자동 닫기
const handleDateSelect = (date: Date) => {
  setFormData(prev => ({ ...prev, start_date: format(date, "yyyy-MM-dd") }))
  setStartDateOpen(false) // 선택 후 자동 닫기
}
```
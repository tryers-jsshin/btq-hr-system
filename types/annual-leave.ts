export interface AnnualLeaveBalance {
  id: string
  member_id: string
  member_name: string
  team_name: string
  join_date: string
  total_granted: number // 총 부여된 연차
  total_used: number // 총 사용된 연차
  total_expired: number // 총 소멸된 연차
  current_balance: number // 현재 잔여 연차
  last_updated: string
  created_at: string
  updated_at: string
}

export interface AnnualLeaveTransaction {
  id: string
  member_id: string
  member_name: string
  transaction_type: "grant" | "use" | "expire" | "adjust" // 부여, 사용, 소멸, 조정
  amount: number // 양수: 부여/복구, 음수: 사용/차감
  reason: string
  grant_date?: string // 부여일 (소멸 계산용)
  expire_date?: string // 소멸 예정일
  reference_id?: string // 휴가 신청 ID 등 참조
  created_by: string
  created_at: string
  updated_at: string
}

export interface AnnualLeavePolicy {
  id: string
  policy_name: string
  description: string
  is_active: boolean

  // 1단계: 입사 첫 해 정책
  first_year_monthly_grant: number // 매월 부여 일수 (기본 1일)
  first_year_max_days: number // 첫 해 최대 연차 (기본 11일)

  // 2단계: 입사 1년 이후 정책
  base_annual_days: number // 기본 연차 일수 (기본 15일)
  increment_years: number // 증가 주기 (기본 2년)
  increment_days: number // 증가 일수 (기본 1일)
  max_annual_days: number // 최대 연차 일수 (기본 25일)

  // 소멸 정책
  expire_after_months: number // 부여 후 소멸까지 개월 수 (기본 12개월)

  created_at: string
  updated_at: string
}

export interface AnnualLeaveCalculation {
  member_id: string
  member_name: string
  join_date: string
  years_of_service: number
  current_phase: "first_year" | "annual_grant"

  // 계산 결과
  should_grant_today: number
  should_expire_today: number
  next_grant_date?: string
  next_expire_date?: string

  // 상세 정보
  monthly_grants_received: number // 첫 해 월별 부여 받은 횟수
  annual_grants_received: number // 연간 부여 받은 횟수
}

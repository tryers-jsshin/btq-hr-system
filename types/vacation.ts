export interface VacationRequest {
  id: string
  memberId: string
  memberName: string
  teamName: string
  type: "annual" | "morning_half" | "afternoon_half" // 연차, 오전반차, 오후반차
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD (단일일인 경우 startDate와 동일)
  days: number // 실제 사용 일수 (반차는 0.5)
  reason: string // 신청 사유
  status: "pending" | "approved" | "rejected" | "cancelled"
  rejectionReason?: string // 반려 사유
  approvedBy?: string // 승인자 ID
  approvedAt?: string // 승인 일시
  createdAt: string
  updatedAt: string
}

export interface VacationAllowance {
  id: string
  memberId: string
  memberName: string
  teamName: string
  year: number
  totalDays: number // 연간 부여 연차
  usedDays: number // 사용한 연차
  remainingDays: number // 잔여 연차
  createdAt: string
  updatedAt: string
}

export interface VacationUsageDetail {
  requestId: string
  type: "annual" | "morning_half" | "afternoon_half"
  startDate: string
  endDate: string
  days: number
  status: "approved" | "cancelled"
  approvedAt: string
}

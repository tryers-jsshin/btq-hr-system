export type LeaveType = "연차" | "오전반차" | "오후반차"

export type LeaveRequestStatus = "대기중" | "승인됨" | "반려됨" | "취소됨"

export interface LeaveRequest {
  id: string
  member_id: string
  member_name: string
  team_name: string | null
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: LeaveRequestStatus
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  rejected_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  created_at: string
  updated_at: string
}

export interface LeaveRequestInsert {
  id?: string
  member_id: string
  member_name: string
  team_name?: string | null
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason?: string | null
  status?: LeaveRequestStatus
  requested_at?: string
  approved_at?: string | null
  approved_by?: string | null
  rejected_reason?: string | null
  cancelled_at?: string | null
  cancelled_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface LeaveRequestUpdate {
  id?: string
  member_id?: string
  member_name?: string
  team_name?: string | null
  leave_type?: LeaveType
  start_date?: string
  end_date?: string
  total_days?: number
  reason?: string | null
  status?: LeaveRequestStatus
  requested_at?: string
  approved_at?: string | null
  approved_by?: string | null
  rejected_reason?: string | null
  cancelled_at?: string | null
  cancelled_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface LeaveRequestDetail extends LeaveRequest {
  // 추가 정보들
  remaining_balance?: number
  working_days?: string[] // 근무일 목록 (오프 제외)
  affected_work_schedule?: Array<{
    date: string
    current_work_type?: string
    will_be_work_type: string
  }>
}

// 연차 신청 폼 데이터
export interface LeaveRequestFormData {
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason?: string
}

// 연차 승인/반려 데이터
export interface LeaveApprovalData {
  request_id: string
  action: "approve" | "reject"
  rejected_reason?: string
  approved_by: string
}

// 연차 취소 데이터
export interface LeaveCancellationData {
  request_id: string
  cancelled_by: string
}

// 연차 신청 통계
export interface LeaveRequestStats {
  total_requests: number
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  cancelled_requests: number
  total_days_used: number
}
// 출퇴근 스냅샷
export interface AttendanceSnapshot {
  id: string
  filename: string
  upload_date: string
  uploaded_by: string
  uploaded_at: string
  total_records: number
  status: "uploaded" | "processing" | "completed" | "failed"
  error_message?: string | null
  created_at: string
  updated_at: string
}

// 출퇴근 기록
export interface AttendanceRecord {
  id: string
  snapshot_id: string
  employee_number: string
  member_id?: string | null
  member_name: string
  work_date: string
  check_in_time?: string | null
  check_out_time?: string | null
  
  // 근무표 매칭 정보
  schedule_id?: string | null
  work_type_id?: string | null
  scheduled_start_time?: string | null
  scheduled_end_time?: string | null
  
  // 계산된 값들
  is_late: boolean
  late_minutes: number
  is_early_leave: boolean
  early_leave_minutes: number
  overtime_minutes: number
  actual_work_minutes: number
  
  // 수정 추적
  is_modified: boolean
  modified_by?: string | null
  modified_at?: string | null
  modification_reason?: string | null
  
  created_at: string
  updated_at: string
}

// 초과근무 정산
export interface OvertimeSettlement {
  id: string
  member_id: string
  member_name: string
  settlement_month: string // YYYY-MM
  
  // 월별 집계
  total_overtime_minutes: number
  total_late_minutes: number
  late_count: number
  net_overtime_minutes: number // 초과근무 - 지각시간
  
  // 정산 정보
  converted_leave_days: number
  settlement_status: "pending" | "completed" | "cancelled"
  settled_by?: string | null
  settled_at?: string | null
  settlement_note?: string | null
  
  created_at: string
  updated_at: string
}

// CSV 업로드 데이터
export interface AttendanceCsvRow {
  employee_number: string
  member_name: string
  work_date: string // YYYY/MM/DD 형식
  check_in_time?: string // HH:mm 형식
  check_out_time?: string // HH:mm 형식
}

// 근태 상세 정보 (조인된 데이터)
export interface AttendanceDetail extends AttendanceRecord {
  work_type_name?: string
  work_type_bgcolor?: string
  work_type_fontcolor?: string
  team_name?: string
  // 휴가 관련 정보
  is_leave?: boolean
  is_holiday?: boolean
  deduction_days?: number | null
}

// 근태 요약 통계
export interface AttendanceSummary {
  member_id: string
  member_name: string
  team_name?: string
  period: string // YYYY-MM
  work_days: number
  late_days: number
  early_leave_days: number
  total_late_minutes: number
  total_overtime_minutes: number
  net_overtime_minutes: number
}

// 근태 수정 요청
export interface AttendanceModifyRequest {
  record_id: string
  check_in_time?: string | null
  check_out_time?: string | null
  modification_reason: string
  modified_by: string
}

// CSV 업로드 결과
export interface CsvUploadResult {
  snapshot_id: string
  total_rows: number
  processed_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  errors: Array<{
    row: number
    employee_number?: string
    error: string
  }>
}

// 근태 필터
export interface AttendanceFilter {
  member_id?: string
  team_id?: string
  start_date?: string
  end_date?: string
  is_late?: boolean
  has_overtime?: boolean
  is_modified?: boolean
}
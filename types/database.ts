export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          member_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          member_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          member_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      work_types: {
        Row: {
          id: string
          name: string
          start_time: string
          end_time: string
          bgcolor: string
          fontcolor: string
          is_leave: boolean
          deduction_days: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_time: string
          end_time: string
          bgcolor?: string
          fontcolor?: string
          is_leave?: boolean
          deduction_days?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_time?: string
          end_time?: string
          bgcolor?: string
          fontcolor?: string
          is_leave?: boolean
          deduction_days?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          name: string
          password: string
          employee_number: string
          team_id: string | null
          team_name: string | null
          role: "일반직원" | "관리자"
          join_date: string
          phone: string
          weekly_schedule: any
          status: "active" | "terminated" | "rehired"
          termination_date: string | null
          termination_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          password: string
          employee_number: string
          team_id?: string | null
          team_name?: string | null
          role?: "일반직원" | "관리자"
          join_date: string
          phone: string
          weekly_schedule?: any
          status?: "active" | "terminated" | "rehired"
          termination_date?: string | null
          termination_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          password?: string
          employee_number?: string
          team_id?: string | null
          team_name?: string | null
          role?: "일반직원" | "관리자"
          join_date?: string
          phone?: string
          weekly_schedule?: any
          status?: "active" | "terminated" | "rehired"
          termination_date?: string | null
          termination_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_schedule_entries: {
        Row: {
          id: string
          member_id: string
          date: string
          work_type_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          date: string
          work_type_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          date?: string
          work_type_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      termination_logs: {
        Row: {
          id: string
          member_id: string
          action: "terminate" | "cancel" | "rehire"
          termination_date: string | null
          termination_reason: string | null
          cancellation_reason: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          action: "terminate" | "cancel" | "rehire"
          termination_date?: string | null
          termination_reason?: string | null
          cancellation_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          action?: "terminate" | "cancel" | "rehire"
          termination_date?: string | null
          termination_reason?: string | null
          cancellation_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          member_id: string
          member_name: string
          team_name: string | null
          leave_type: "연차" | "오전반차" | "오후반차"
          start_date: string
          end_date: string
          total_days: number
          reason: string | null
          status: "대기중" | "승인됨" | "반려됨" | "취소됨"
          requested_at: string
          approved_at: string | null
          approved_by: string | null
          rejected_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          member_name: string
          team_name?: string | null
          leave_type: "연차" | "오전반차" | "오후반차"
          start_date: string
          end_date: string
          total_days: number
          reason?: string | null
          status?: "대기중" | "승인됨" | "반려됨" | "취소됨"
          requested_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejected_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          member_name?: string
          team_name?: string | null
          leave_type?: "연차" | "오전반차" | "오후반차"
          start_date?: string
          end_date?: string
          total_days?: number
          reason?: string | null
          status?: "대기중" | "승인됨" | "반려됨" | "취소됨"
          requested_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejected_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

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
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          name: string
          email: string
          login_id: string
          password: string
          employee_number: string
          team_id: string | null
          team_name: string | null
          role: "일반직원" | "관리자"
          join_date: string
          phone: string
          weekly_schedule: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          login_id: string
          password: string
          employee_number: string
          team_id?: string | null
          team_name?: string | null
          role?: "일반직원" | "관리자"
          join_date: string
          phone: string
          weekly_schedule?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          login_id?: string
          password?: string
          employee_number?: string
          team_id?: string | null
          team_name?: string | null
          role?: "일반직원" | "관리자"
          join_date?: string
          phone?: string
          weekly_schedule?: any
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
      vacation_requests: {
        Row: {
          id: string
          member_id: string
          member_name: string
          team_name: string
          type: "annual" | "morning_half" | "afternoon_half"
          start_date: string
          end_date: string
          days: number
          reason: string
          status: "pending" | "approved" | "rejected" | "cancelled"
          rejection_reason: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          member_name: string
          team_name: string
          type: "annual" | "morning_half" | "afternoon_half"
          start_date: string
          end_date: string
          days: number
          reason: string
          status?: "pending" | "approved" | "rejected" | "cancelled"
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          member_name?: string
          team_name?: string
          type?: "annual" | "morning_half" | "afternoon_half"
          start_date?: string
          end_date?: string
          days?: number
          reason?: string
          status?: "pending" | "approved" | "rejected" | "cancelled"
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vacation_allowances: {
        Row: {
          id: string
          member_id: string
          member_name: string
          team_name: string
          year: number
          total_days: number
          used_days: number
          remaining_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          member_name: string
          team_name: string
          year: number
          total_days?: number
          used_days?: number
          remaining_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          member_name?: string
          team_name?: string
          year?: number
          total_days?: number
          used_days?: number
          remaining_days?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

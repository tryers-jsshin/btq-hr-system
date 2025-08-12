import { supabase } from "./supabase"
import type { Database } from "@/types/database"

type MileageTransaction = Database["public"]["Tables"]["work_mileage_transactions"]["Row"]
type MileageTransactionInsert = Database["public"]["Tables"]["work_mileage_transactions"]["Insert"]

export interface MileageSummary {
  currentBalance: number
  monthlyChange: number
  overtimeMinutes: number
  lateMinutes: number
  earlyLeaveMinutes: number
  workBasedChange?: number  // 근무 기반 변동
  adminAdjustChange?: number  // 관리자 조정
}

export interface MileageAdjustRequest {
  memberId: string
  minutes: number
  reason: string
  createdBy: string
}

export class SupabaseWorkMileageStorage {
  // ==================== 마일리지 잔액 조회 ====================
  
  // 현재 마일리지 잔액 조회 (활성 트랜잭션만)
  async getMileageBalance(memberId: string): Promise<number> {
    const { data, error } = await supabase
      .from("work_mileage_transactions")
      .select("minutes")
      .eq("member_id", memberId)
      .eq("is_active", true)  // 활성 레코드만 조회
    
    if (error) {
      console.error("Error fetching mileage balance:", error)
      return 0
    }
    
    return data?.reduce((sum, t) => sum + t.minutes, 0) || 0
  }

  // 현재 마일리지 잔액 상세 조회 (근무/조정 구분)
  async getMileageBalanceDetail(memberId: string): Promise<{
    total: number
    workBased: number
    adminAdjust: number
  }> {
    const { data, error } = await supabase
      .from("work_mileage_transactions")
      .select("transaction_type, minutes")
      .eq("member_id", memberId)
      .eq("is_active", true)
    
    if (error) {
      console.error("Error fetching mileage balance detail:", error)
      return { total: 0, workBased: 0, adminAdjust: 0 }
    }
    
    let total = 0
    let workBased = 0
    let adminAdjust = 0
    
    data?.forEach(t => {
      total += t.minutes
      if (t.transaction_type === 'admin_adjust') {
        adminAdjust += t.minutes
      } else {
        workBased += t.minutes
      }
    })
    
    return { total, workBased, adminAdjust }
  }
  
  // 특정 월의 변동분 조회
  async getMonthlyChange(memberId: string, yearMonth: string): Promise<number> {
    const [year, month] = yearMonth.split("-")
    const startDate = `${yearMonth}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${yearMonth}-${lastDay}`
    
    const { data, error } = await supabase
      .from("work_mileage_transactions")
      .select("minutes")
      .eq("member_id", memberId)
      .gte("work_date", startDate)  // work_date 사용
      .lte("work_date", endDate)
      .eq("is_active", true)  // 활성 레코드만
    
    if (error) {
      console.error("Error fetching monthly change:", error)
      return 0
    }
    
    return data?.reduce((sum, t) => sum + t.minutes, 0) || 0
  }
  
  // 월별 마일리지 요약 정보 (근무/조정 구분 추가)
  async getMonthlySummary(memberId: string, yearMonth: string): Promise<MileageSummary> {
    const [year, month] = yearMonth.split("-")
    const startDate = `${yearMonth}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${yearMonth}-${lastDay}`
    
    // 전체 잔액
    const currentBalance = await this.getMileageBalance(memberId)
    
    // 이번 달 거래 내역 (활성 레코드만)
    const { data: monthlyTransactions, error } = await supabase
      .from("work_mileage_transactions")
      .select("transaction_type, minutes")
      .eq("member_id", memberId)
      .gte("work_date", startDate)  // work_date 사용
      .lte("work_date", endDate)
      .eq("is_active", true)  // 활성 레코드만
    
    if (error) {
      console.error("Error fetching monthly summary:", error)
      return {
        currentBalance,
        monthlyChange: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        workBasedChange: 0,
        adminAdjustChange: 0,
      }
    }
    
    let overtimeMinutes = 0
    let lateMinutes = 0
    let earlyLeaveMinutes = 0
    let monthlyChange = 0
    let workBasedChange = 0  // 근무 기반 변동
    let adminAdjustChange = 0  // 관리자 조정
    
    monthlyTransactions?.forEach(t => {
      monthlyChange += t.minutes
      
      switch (t.transaction_type) {
        case 'overtime':
          overtimeMinutes += t.minutes
          workBasedChange += t.minutes
          break
        case 'late':
          lateMinutes += Math.abs(t.minutes) // 음수로 저장되므로 절대값
          workBasedChange += t.minutes
          break
        case 'early_leave':
          earlyLeaveMinutes += Math.abs(t.minutes)
          workBasedChange += t.minutes
          break
        case 'admin_adjust':
          adminAdjustChange += t.minutes
          break
      }
    })
    
    return {
      currentBalance,
      monthlyChange,
      overtimeMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      workBasedChange,
      adminAdjustChange,
    }
  }
  
  // ==================== 마일리지 거래 생성 ====================
  
  // 관리자 조정
  async createAdminAdjustment(request: MileageAdjustRequest): Promise<void> {
    const { memberId, minutes, reason, createdBy } = request
    
    if (!reason || reason.trim() === '') {
      throw new Error("조정 사유를 입력해주세요.")
    }
    
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from("work_mileage_transactions")
      .insert({
        member_id: memberId,
        work_date: today,  // work_date 추가
        transaction_date: today,
        transaction_type: 'admin_adjust',
        minutes: minutes,
        reason: reason,
        created_by: createdBy,
        event_source: 'manual',  // event_source 추가
        is_active: true  // 명시적으로 true 설정
      })
    
    if (error) {
      console.error("Error creating admin adjustment:", error)
      throw new Error("마일리지 조정 중 오류가 발생했습니다.")
    }
  }
  
  // ==================== 마일리지 거래 내역 조회 ====================
  
  // 거래 내역 조회 (활성 레코드만)
  async getTransactionHistory(
    memberId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MileageTransaction[]> {
    const { data, error } = await supabase
      .from("work_mileage_transactions")
      .select("*")
      .eq("member_id", memberId)
      .eq("is_active", true)  // 활성 레코드만
      .order("work_date", { ascending: false })  // work_date 기준 정렬
      .order("created_at", { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error("Error fetching transaction history:", error)
      return []
    }
    
    return data || []
  }
  
  // 특정 날짜의 거래 조회 (중복 방지용)
  async getTransactionsByDate(
    memberId: string,
    workDate: string,
    transactionType?: string
  ): Promise<MileageTransaction[]> {
    let query = supabase
      .from("work_mileage_transactions")
      .select("*")
      .eq("member_id", memberId)
      .eq("transaction_date", workDate)
    
    if (transactionType) {
      query = query.eq("transaction_type", transactionType)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching transactions by date:", error)
      return []
    }
    
    return data || []
  }
  
  // 참조 ID로 거래 조회 (근태 기록과 연결된 거래 찾기)
  async getTransactionsByReference(referenceId: string): Promise<MileageTransaction[]> {
    const { data, error } = await supabase
      .from("work_mileage_transactions")
      .select("*")
      .eq("reference_id", referenceId)
    
    if (error) {
      console.error("Error fetching transactions by reference:", error)
      return []
    }
    
    return data || []
  }
  
  // ==================== 근태 연동 처리 ====================
  
  // 근태 기록 변경 시 마일리지 자동 업데이트 (이벤트 소싱 방식)
  async syncFromAttendance(
    memberId: string,
    workDate: string,
    attendanceId: string | undefined,
    lateMinutes: number,
    earlyLeaveMinutes: number,
    overtimeMinutes: number,
    source: 'attendance' | 'leave' | 'schedule' = 'attendance'
  ): Promise<void> {
    console.log(`[syncFromAttendance] Processing for ${memberId} on ${workDate}`)
    console.log(`[syncFromAttendance] Source: ${source}, Values: late=${lateMinutes}, early=${earlyLeaveMinutes}, overtime=${overtimeMinutes}`)
    
    // 1. 해당 날짜의 기존 활성 트랜잭션을 비활성화 (관리자 조정 제외)
    const { error: deactivateError } = await supabase
      .from("work_mileage_transactions")
      .update({ is_active: false })
      .eq("member_id", memberId)
      .eq("work_date", workDate)
      .eq("is_active", true)
      .neq("transaction_type", "admin_adjust")  // 관리자 조정은 유지
    
    if (deactivateError) {
      console.error("[syncFromAttendance] Error deactivating old transactions:", deactivateError)
    }
    
    // 2. 새로운 트랜잭션 생성 (배치 삽입)
    const newTransactions: MileageTransactionInsert[] = []
    
    if (lateMinutes > 0) {
      newTransactions.push({
        member_id: memberId,
        work_date: workDate,
        transaction_date: workDate,
        transaction_type: 'late',
        minutes: -lateMinutes,  // 차감이므로 음수
        event_source: source,
        source_id: attendanceId,
        reference_id: attendanceId,  // 하위 호환성
        is_active: true
      })
    }
    
    if (earlyLeaveMinutes > 0) {
      newTransactions.push({
        member_id: memberId,
        work_date: workDate,
        transaction_date: workDate,
        transaction_type: 'early_leave',
        minutes: -earlyLeaveMinutes,  // 차감이므로 음수
        event_source: source,
        source_id: attendanceId,
        reference_id: attendanceId,
        is_active: true
      })
    }
    
    if (overtimeMinutes > 0) {
      newTransactions.push({
        member_id: memberId,
        work_date: workDate,
        transaction_date: workDate,
        transaction_type: 'overtime',
        minutes: overtimeMinutes,  // 추가이므로 양수
        event_source: source,
        source_id: attendanceId,
        reference_id: attendanceId,
        is_active: true
      })
    }
    
    // 3. 새 트랜잭션 삽입
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from("work_mileage_transactions")
        .insert(newTransactions)
      
      if (insertError) {
        console.error("[syncFromAttendance] Error inserting new transactions:", insertError)
      } else {
        console.log(`[syncFromAttendance] Created ${newTransactions.length} new transactions`)
      }
    } else {
      console.log("[syncFromAttendance] No transactions to create (all values are 0)")
    }
  }
  
  // ==================== 통계 및 리포트 ====================
  
  // 전체 구성원 마일리지 현황
  async getAllMembersMileage(): Promise<Array<{ memberId: string, balance: number }>> {
    const { data: members } = await supabase
      .from("members")
      .select("id")
      .eq("status", "active")
    
    if (!members) return []
    
    const balances = await Promise.all(
      members.map(async (member) => ({
        memberId: member.id,
        balance: await this.getMileageBalance(member.id)
      }))
    )
    
    return balances
  }
}

// 싱글톤 인스턴스
export const supabaseWorkMileageStorage = new SupabaseWorkMileageStorage()
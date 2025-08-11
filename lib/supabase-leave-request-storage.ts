import { supabase } from "./supabase"
import { supabaseAnnualLeaveStorage } from "./supabase-annual-leave-storage"
import { supabaseWorkScheduleStorage } from "./supabase-work-schedule-storage"
import type {
  LeaveRequest,
  LeaveRequestInsert,
  LeaveRequestUpdate,
  LeaveRequestDetail,
  LeaveRequestFormData,
  LeaveApprovalData,
  LeaveCancellationData,
  LeaveRequestStats,
  LeaveType,
  LeaveRequestStatus,
} from "@/types/leave-request"

export class SupabaseLeaveRequestStorage {
  // 연차 신청 생성
  async createLeaveRequest(data: LeaveRequestFormData, memberId: string): Promise<LeaveRequest> {
    console.log("연차 신청 생성:", data, memberId)

    // 구성원 정보 조회
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("name, team_name, weekly_schedule")
      .eq("id", memberId)
      .eq("status", "active")
      .single()

    if (memberError || !member) {
      throw new Error("구성원 정보를 찾을 수 없습니다.")
    }

    // 잔여 연차 확인
    const balance = await supabaseAnnualLeaveStorage.getBalanceByMemberId(memberId)
    if (!balance || balance.current_balance <= 0) {
      throw new Error("잔여 연차가 부족합니다.")
    }

    // 근무일 계산 (오프 제외)
    const workingDays = await this.calculateWorkingDays(
      data.start_date,
      data.end_date,
      member.weekly_schedule,
      data.leave_type
    )

    if (workingDays.length === 0) {
      throw new Error("신청 기간에 근무일이 없습니다.")
    }

    // 반차는 단일 날짜만 허용
    if ((data.leave_type === "오전반차" || data.leave_type === "오후반차") && workingDays.length > 1) {
      throw new Error("반차는 단일 날짜만 신청 가능합니다.")
    }

    // 연차 소모량 계산
    const totalDays = this.calculateLeaveDays(workingDays, data.leave_type)

    // 잔여 연차 확인
    if (balance.current_balance < totalDays) {
      throw new Error(`잔여 연차(${balance.current_balance}일)가 부족합니다. 필요한 연차: ${totalDays}일`)
    }

    // 일별 연차 사용량 한도 확인 (1일 초과 방지)
    const exceedsLimit = await this.checkDailyLeaveLimit(memberId, data.start_date, data.end_date, data.leave_type)
    if (exceedsLimit) {
      throw new Error("해당 날짜에 이미 승인된 연차가 있어 추가 신청이 불가합니다. (일일 최대 1일)")
    }

    const insertData: LeaveRequestInsert = {
      member_id: memberId,
      member_name: member.name,
      team_name: member.team_name,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: totalDays,
      reason: data.reason || null,
      status: "대기중",
      requested_at: new Date().toISOString(),
    }

    const { data: request, error } = await supabase
      .from("leave_requests")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("연차 신청 생성 오류:")
      console.error("- 오류 코드:", error.code)
      console.error("- 오류 메시지:", error.message)
      console.error("- 오류 세부사항:", error.details)
      console.error("- 오류 힌트:", error.hint)
      console.error("- 삽입 데이터:", insertData)
      throw new Error(`연차 신청 중 오류가 발생했습니다: ${error.message}`)
    }

    return request
  }

  // 연차 승인
  async approveLeaveRequest(approvalData: LeaveApprovalData): Promise<void> {
    console.log("연차 승인 처리:", approvalData)

    const { data: request, error: requestError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", approvalData.request_id)
      .eq("status", "대기중")
      .single()

    if (requestError || !request) {
      throw new Error("승인 대상 연차 신청을 찾을 수 없습니다.")
    }

    // 잔여 연차 재확인
    const balance = await supabaseAnnualLeaveStorage.getBalanceByMemberId(request.member_id)
    if (!balance || balance.current_balance < request.total_days) {
      throw new Error("잔여 연차가 부족하여 승인할 수 없습니다.")
    }

    // 트랜잭션으로 처리
    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({
        status: "승인됨",
        approved_at: new Date().toISOString(),
        approved_by: approvalData.approved_by,
      })
      .eq("id", approvalData.request_id)

    if (updateError) {
      throw new Error("연차 승인 업데이트 중 오류가 발생했습니다.")
    }

    // 연차 차감 처리
    await supabaseAnnualLeaveStorage.createTransaction({
      member_id: request.member_id,
      member_name: request.member_name,
      transaction_type: "use",
      amount: -request.total_days,
      reason: `${request.leave_type} 사용 (${request.start_date}~${request.end_date})`,
      reference_id: request.id, // 연차 신청 ID 참조
      created_by: approvalData.approved_by,
    })

    // 잔액 업데이트
    await supabaseAnnualLeaveStorage.updateMemberBalance(request.member_id)

    // 근무표에 연차 반영
    await this.updateWorkScheduleForLeave(request)
  }

  // 연차 반려
  async rejectLeaveRequest(rejectionData: { request_id: string; rejected_reason?: string; rejected_by: string }): Promise<void> {
    console.log("연차 반려 처리:", rejectionData)

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "반려됨",
        rejected_reason: rejectionData.rejected_reason || null,
        approved_by: rejectionData.rejected_by, // 반려자도 approved_by 필드에 저장
        approved_at: new Date().toISOString(),
      })
      .eq("id", rejectionData.request_id)
      .eq("status", "대기중")

    if (error) {
      throw new Error("연차 반려 처리 중 오류가 발생했습니다.")
    }
  }

  // 연차 취소 (시작일 전까지만 가능)
  async cancelLeaveRequest(cancellationData: LeaveCancellationData): Promise<void> {
    console.log("연차 취소 처리:", cancellationData)

    const { data: request, error: requestError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", cancellationData.request_id)
      .in("status", ["대기중", "승인됨"])
      .single()

    if (requestError || !request) {
      throw new Error("취소 대상 연차 신청을 찾을 수 없습니다.")
    }

    // 시작일 확인
    const startDate = new Date(request.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate <= today) {
      throw new Error("시작일이 지난 연차는 취소할 수 없습니다.")
    }

    // 취소 처리
    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({
        status: "취소됨",
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancellationData.cancelled_by,
      })
      .eq("id", cancellationData.request_id)

    if (updateError) {
      throw new Error("연차 취소 처리 중 오류가 발생했습니다.")
    }

    // 승인된 연차였다면 차감된 연차 복구
    if (request.status === "승인됨") {
      console.log(`승인된 연차 취소로 인한 복구 처리: ${request.total_days}일`)
      
      // 사용 거래를 상쇄하는 복구 거래 생성 (use 타입으로 양수 처리)
      await supabaseAnnualLeaveStorage.createTransaction({
        member_id: request.member_id,
        member_name: request.member_name,
        transaction_type: "use",
        amount: request.total_days, // 양수로 저장하여 사용을 상쇄
        reason: `${request.leave_type} 취소로 인한 사용 상쇄 (${request.start_date}~${request.end_date})`,
        reference_id: request.id, // 연차 신청 ID 참조
        created_by: cancellationData.cancelled_by,
      })

      console.log("연차 잔액 업데이트 시작")
      await supabaseAnnualLeaveStorage.updateMemberBalance(request.member_id)

      console.log("근무표에서 연차 제거 시작")
      // 근무표에서 연차 제거
      await this.removeWorkScheduleForLeave(request)
      
      console.log("연차 취소 및 복구 처리 완료")
    }
  }

  // 구성원별 연차 신청 목록 조회
  async getLeaveRequestsByMemberId(memberId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("member_id", memberId)
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("연차 신청 목록 조회 오류:", error)
      throw new Error("연차 신청 목록을 조회할 수 없습니다.")
    }

    return data || []
  }

  // 전체 연차 신청 목록 조회 (관리자용)
  async getAllLeaveRequests(status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    let query = supabase
      .from("leave_requests")
      .select("*")

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query.order("requested_at", { ascending: false })

    if (error) {
      console.error("전체 연차 신청 목록 조회 오류:", error)
      throw new Error("연차 신청 목록을 조회할 수 없습니다.")
    }

    return data || []
  }

  // 대기중인 연차 신청 목록 조회
  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return this.getAllLeaveRequests("대기중")
  }

  // 연차 신청 상세 조회
  async getLeaveRequestDetail(requestId: string): Promise<LeaveRequestDetail | null> {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (error || !data) {
      return null
    }

    // 잔여 연차 정보 추가
    const balance = await supabaseAnnualLeaveStorage.getBalanceByMemberId(data.member_id)
    
    return {
      ...data,
      remaining_balance: balance?.current_balance || 0,
    }
  }

  // 근무일 계산 (오프 제외)
  private async calculateWorkingDays(
    startDate: string,
    endDate: string,
    weeklySchedule: any,
    leaveType: LeaveType
  ): Promise<string[]> {
    const workingDays: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    // 반차는 단일 날짜만
    if (leaveType === "오전반차" || leaveType === "오후반차") {
      const dayOfWeek = this.getDayOfWeek(start)
      if (weeklySchedule[dayOfWeek] !== "off") {
        workingDays.push(startDate)
      }
      return workingDays
    }

    // 연차는 범위 내 모든 근무일
    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      const dayOfWeek = this.getDayOfWeek(current)
      
      if (weeklySchedule[dayOfWeek] !== "off") {
        workingDays.push(dateStr)
      }
      
      current.setDate(current.getDate() + 1)
    }

    return workingDays
  }

  // 연차 소모량 계산
  private calculateLeaveDays(workingDays: string[], leaveType: LeaveType): number {
    if (leaveType === "오전반차" || leaveType === "오후반차") {
      return workingDays.length * 0.5
    }
    return workingDays.length
  }

  // 요일 변환
  private getDayOfWeek(date: Date): string {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return days[date.getDay()]
  }

  // 일별 연차 사용량 한도 확인 (1일 초과 방지)
  private async checkDailyLeaveLimit(
    memberId: string, 
    startDate: string, 
    endDate: string, 
    leaveType: LeaveType
  ): Promise<boolean> {
    console.log(`일별 연차 한도 확인: ${memberId}, ${startDate}~${endDate}, 휴가유형: ${leaveType}`)

    // 모든 휴가 유형의 차감량을 한 번에 조회 (성능 최적화)
    const { data: allWorkTypes } = await supabase
      .from("work_types")
      .select("name, deduction_days")
      .not("deduction_days", "is", null)

    const workTypeMap = new Map<string, number>()
    allWorkTypes?.forEach(wt => {
      workTypeMap.set(wt.name, wt.deduction_days)
    })

    const dailyDeduction = workTypeMap.get(leaveType) || 1 // 기본값 1일
    console.log(`${leaveType}의 일별 차감량: ${dailyDeduction}일`)

    // 신청하려는 기간의 각 날짜를 확인
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      
      // 해당 날짜에 이미 승인된 연차들 조회
      const { data: existingLeaves, error } = await supabase
        .from("leave_requests")
        .select("leave_type")
        .eq("member_id", memberId)
        .eq("status", "승인됨")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)

      if (error) {
        console.error("기존 연차 조회 오류:", error)
        return false
      }

      // 각 기존 연차의 일별 차감량을 맵에서 조회하여 합계 계산
      let existingTotal = 0
      for (const leave of existingLeaves || []) {
        const existingDailyDeduction = workTypeMap.get(leave.leave_type) || 1
        existingTotal += existingDailyDeduction
      }
      
      // 신청하려는 연차량과 합쳐서 1일 초과하는지 확인
      const totalAfterNew = existingTotal + dailyDeduction
      
      console.log(`${dateStr}: 기존 ${existingTotal}일 + 신청 ${dailyDeduction}일 = 총 ${totalAfterNew}일`)
      
      if (totalAfterNew > 1) {
        console.log(`${dateStr}에 일일 한도(1일) 초과: ${totalAfterNew}일`)
        return true
      }
      
      current.setDate(current.getDate() + 1)
    }

    console.log("모든 날짜에서 일일 한도 내 확인됨")
    return false
  }

  // 근무표에 연차 반영
  private async updateWorkScheduleForLeave(request: LeaveRequest): Promise<void> {
    console.log("근무표에 연차 반영:", request)

    // work_types 테이블에서 연차 유형별 ID 조회 (deduction_days가 있는 것들)
    const { data: workTypes, error } = await supabase
      .from("work_types")
      .select("id, name")
      .not("deduction_days", "is", null)

    if (error || !workTypes) {
      console.error("근무 유형 조회 오류:", error)
      return
    }

    const workTypeMap: Record<string, string> = {}
    workTypes.forEach(wt => {
      workTypeMap[wt.name] = wt.id
    })

    const workTypeId = workTypeMap[request.leave_type]
    if (!workTypeId) {
      console.error("해당 연차 유형의 근무 유형을 찾을 수 없습니다:", request.leave_type)
      return
    }

    const start = new Date(request.start_date)
    const end = new Date(request.end_date)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      
      try {
        await supabaseWorkScheduleStorage.upsertWorkSchedule(request.member_id, dateStr, workTypeId)
      } catch (error) {
        console.error(`근무표 업데이트 오류 (${dateStr}):`, error)
      }
      
      current.setDate(current.getDate() + 1)
    }
  }

  // 근무표에서 연차 제거
  private async removeWorkScheduleForLeave(request: LeaveRequest): Promise<void> {
    console.log("근무표에서 연차 제거:", request)

    const start = new Date(request.start_date)
    const end = new Date(request.end_date)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      
      try {
        await supabaseWorkScheduleStorage.deleteWorkSchedule(request.member_id, dateStr)
      } catch (error) {
        console.error(`근무표 제거 오류 (${dateStr}):`, error)
      }
      
      current.setDate(current.getDate() + 1)
    }
  }

  // 연차 신청 통계
  async getLeaveRequestStats(memberId?: string): Promise<LeaveRequestStats> {
    let query = supabase.from("leave_requests").select("status, total_days")

    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    const { data, error } = await query

    if (error) {
      console.error("연차 신청 통계 조회 오류:", error)
      throw new Error("연차 신청 통계를 조회할 수 없습니다.")
    }

    const stats: LeaveRequestStats = {
      total_requests: data?.length || 0,
      pending_requests: 0,
      approved_requests: 0,
      rejected_requests: 0,
      cancelled_requests: 0,
      total_days_used: 0,
    }

    data?.forEach((request) => {
      switch (request.status) {
        case "대기중":
          stats.pending_requests++
          break
        case "승인됨":
          stats.approved_requests++
          stats.total_days_used += request.total_days
          break
        case "반려됨":
          stats.rejected_requests++
          break
        case "취소됨":
          stats.cancelled_requests++
          break
      }
    })

    return stats
  }
}

export const supabaseLeaveRequestStorage = new SupabaseLeaveRequestStorage()
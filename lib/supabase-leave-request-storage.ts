import { supabase } from "./supabase"
import { supabaseWorkScheduleStorage } from "./supabase-work-schedule-storage"
import { annualLeaveFIFOV2 } from "./annual-leave-fifo-v2"
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
      .select("name, team_name")
      .eq("id", memberId)
      .eq("status", "active")
      .single()

    if (memberError || !member) {
      throw new Error("구성원 정보를 찾을 수 없습니다.")
    }

    // 해당 휴가 유형의 차감량 조회
    const { data: workType } = await supabase
      .from("work_types")
      .select("deduction_days")
      .eq("name", data.leave_type)
      .single()
    
    const deductionDays = workType?.deduction_days || 1
    
    // V2 스토리지 import 및 잔여 연차 확인
    const { supabaseAnnualLeaveStorageV2 } = await import("./supabase-annual-leave-storage-v2")
    const { currentBalance } = await supabaseAnnualLeaveStorageV2.calculateBalance(memberId)
    if (currentBalance <= 0) {
      throw new Error("잔여 연차가 부족합니다.")
    }
    
    // 사용 가능한 부여 목록 조회 (소멸일 확인용)
    const availableGrants = await supabaseAnnualLeaveStorageV2.getAvailableGrants(memberId)
    
    // 근무일 계산 (오프 제외) - 실제 근무표 기준
    const workingDays = await this.calculateWorkingDays(
      data.start_date,
      data.end_date,
      data.leave_type,
      memberId,
      deductionDays
    )
    
    if (workingDays.length === 0) {
      throw new Error("신청 기간에 근무일이 없습니다.")
    }
    
    // 연차 소모량 계산
    const requiredDays = this.calculateLeaveDays(workingDays, deductionDays)
    
    // FIFO 방식으로 각 날짜별 사용 가능 여부 검증
    let availableForPeriod = 0
    const sortedGrants = [...availableGrants].sort((a, b) => {
      const dateA = a.expire_date ? new Date(a.expire_date).getTime() : Infinity
      const dateB = b.expire_date ? new Date(b.expire_date).getTime() : Infinity
      return dateA - dateB
    })
    
    // 모든 연차가 신청 시작일 이전에 소멸되는지 확인
    const requestStart = new Date(data.start_date)
    const allExpiredBeforeStart = sortedGrants.every(grant => {
      if (!grant.expire_date) return false
      return new Date(grant.expire_date) < requestStart
    })
    
    if (allExpiredBeforeStart && sortedGrants.length > 0) {
      // 가장 늦은 소멸일 찾기
      const latestExpireDate = sortedGrants.reduce((latest, grant) => {
        if (!grant.expire_date) return latest
        const expireDate = new Date(grant.expire_date)
        return !latest || expireDate > latest ? expireDate : latest
      }, null as Date | null)
      
      throw new Error(
        `신청하신 기간(${requestStart.toLocaleDateString("ko-KR")})에는 사용 가능한 연차가 없습니다. ` +
        `모든 연차가 ${latestExpireDate?.toLocaleDateString("ko-KR")}까지 소멸 예정입니다.`
      )
    }
    
    // 신청 기간 내에서 사용 가능한 연차 계산
    for (const grant of sortedGrants) {
      if (!grant.expire_date) continue
      
      const expireDate = new Date(grant.expire_date)
      const requestEnd = new Date(data.end_date)
      
      // 이 부여로 커버 가능한 기간 계산
      if (requestEnd <= expireDate) {
        // 전체 기간 사용 가능
        availableForPeriod += (grant as any).availableAmount || grant.amount
      } else if (new Date(data.start_date) <= expireDate) {
        // 부분적으로 사용 가능 (소멸일까지만)
        // 실제로는 더 복잡한 계산 필요하지만, 단순화를 위해 경고만 표시
        console.log(`부여 ${grant.id}는 ${expireDate.toLocaleDateString()}에 소멸 예정`)
      }
    }
    
    // 사용 가능한 연차가 부족한 경우만 에러
    if (availableForPeriod < requiredDays) {
      // 소멸로 인해 사용 불가능한 경우 상세 메시지
      const expiringGrants = sortedGrants.filter(g => 
        g.expire_date && new Date(g.expire_date) < new Date(data.end_date)
      )
      
      if (expiringGrants.length > 0) {
        const earliestExpire = expiringGrants[0].expire_date
        throw new Error(
          `신청 기간 중 일부 연차가 소멸되어 사용할 수 없습니다. ` +
          `${new Date(earliestExpire!).toLocaleDateString("ko-KR")} 이전까지만 사용하거나, ` +
          `기간을 나누어 신청해주세요.`
        )
      }
    }

    // 1일이 아닌 휴가는 단일 날짜만 허용 (반차 등)
    if (deductionDays !== 1 && workingDays.length > 1) {
      throw new Error(`${data.leave_type}는 단일 날짜만 신청 가능합니다.`)
    }

    // 최종 연차 소모량
    const totalDays = requiredDays

    // 잔여 연차 확인
    if (currentBalance < totalDays) {
      throw new Error(`잔여 연차(${currentBalance}일)가 부족합니다. 필요한 연차: ${totalDays}일`)
    }

    // 일별 휴가 중복 확인
    const exceedsLimit = await this.checkDailyLeaveLimit(memberId, data.start_date, data.end_date, data.leave_type)
    if (exceedsLimit) {
      throw new Error("해당 날짜에 이미 신청한 휴가가 있습니다. 다른 날짜를 선택하거나 기존 휴가를 취소 후 신청해주세요.")
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

    // V2 스토리지 import
    const { supabaseAnnualLeaveStorageV2 } = await import("./supabase-annual-leave-storage-v2")
    
    // 잔여 연차 재확인 (V2 사용)
    const { currentBalance } = await supabaseAnnualLeaveStorageV2.calculateBalance(request.member_id)
    if (currentBalance < request.total_days) {
      throw new Error("잔여 연차가 부족하여 승인할 수 없습니다.")
    }
    
    // 승인 시점 FIFO 기반 검증
    const availableGrants = await supabaseAnnualLeaveStorageV2.getAvailableGrants(request.member_id)
    
    // FIFO 방식으로 사용 가능 여부 재확인
    let availableForPeriod = 0
    const sortedGrants = [...availableGrants].sort((a, b) => {
      const dateA = a.expire_date ? new Date(a.expire_date).getTime() : Infinity
      const dateB = b.expire_date ? new Date(b.expire_date).getTime() : Infinity
      return dateA - dateB
    })
    
    // 모든 연차가 신청 시작일 이전에 소멸되는지 확인
    const requestStart = new Date(request.start_date)
    const allExpiredBeforeStart = sortedGrants.every(grant => {
      if (!grant.expire_date) return false
      return new Date(grant.expire_date) < requestStart
    })
    
    if (allExpiredBeforeStart && sortedGrants.length > 0) {
      const latestExpireDate = sortedGrants.reduce((latest, grant) => {
        if (!grant.expire_date) return latest
        const expireDate = new Date(grant.expire_date)
        return !latest || expireDate > latest ? expireDate : latest
      }, null as Date | null)
      
      throw new Error(
        `승인 불가: 신청 기간에 사용 가능한 연차가 없습니다. ` +
        `모든 연차가 ${latestExpireDate?.toLocaleDateString("ko-KR")}에 소멸됩니다.`
      )
    }
    
    for (const grant of sortedGrants) {
      if (!grant.expire_date) continue
      
      const expireDate = new Date(grant.expire_date)
      const requestEnd = new Date(request.end_date)
      
      if (requestEnd <= expireDate) {
        availableForPeriod += (grant as any).availableAmount || grant.amount
      }
    }
    
    if (availableForPeriod < request.total_days) {
      throw new Error(
        `소멸 예정인 연차로 인해 승인할 수 없습니다. 기간을 조정하여 다시 신청해주세요.`
      )
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

    // 연차 차감 처리 (V2 FIFO 방식)
    await annualLeaveFIFOV2.createUsageTransactions(
      request.member_id,
      request.member_name,
      request.leave_type,
      request.start_date,
      request.end_date,
      request.total_days,
      request.id,
      approvalData.approved_by
    )

    // 잔액 업데이트 (V2 사용)
    await supabaseAnnualLeaveStorageV2.updateMemberBalance(request.member_id)

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

  // 연차 취소
  async cancelLeaveRequest(cancellationData: LeaveCancellationData): Promise<{ message?: string }> {
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

    // 권한 확인: 대기중 상태는 누구나, 승인됨 상태는 관리자만
    if (request.status === "승인됨") {
      // 관리자 권한 확인 (cancelled_by가 관리자인지 확인)
      const { data: user } = await supabase
        .from("members")
        .select("is_admin")
        .eq("name", cancellationData.cancelled_by)
        .single()
      
      if (!user?.is_admin) {
        // 본인 확인
        if (request.member_name !== cancellationData.cancelled_by) {
          throw new Error("승인된 연차는 관리자만 취소할 수 있습니다.")
        }
        
        // 시작일 확인 (본인도 시작일 이후는 취소 불가)
        const startDate = new Date(request.start_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (startDate <= today) {
          throw new Error("시작일이 지난 연차는 취소할 수 없습니다.")
        }
      }
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

    // 승인된 연차였다면 처리
    if (request.status === "승인됨") {
      console.log(`승인된 연차 취소로 인한 복구 처리: ${request.total_days}일`)
      
      // V2 시스템 사용: 사용 트랜잭션의 status를 cancelled로 변경
      await annualLeaveFIFOV2.cancelUsageTransactions(request.id, cancellationData.cancelled_by)

      console.log("연차 잔액 업데이트 시작")
      // V2 스토리지로 잔액 업데이트
      const { supabaseAnnualLeaveStorageV2 } = await import("./supabase-annual-leave-storage-v2")
      await supabaseAnnualLeaveStorageV2.updateMemberBalance(request.member_id)

      console.log("근무표 복구 시작")
      // 근무표 복구 또는 제거
      const restoreResult = await this.restoreWorkScheduleForLeave(request)
      
      console.log("연차 취소 및 복구 처리 완료")
      return restoreResult
    }
    
    return {}
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

    // V2 스토리지로 잔여 연차 정보 추가
    const { supabaseAnnualLeaveStorageV2 } = await import("./supabase-annual-leave-storage-v2")
    const { currentBalance } = await supabaseAnnualLeaveStorageV2.calculateBalance(data.member_id)
    
    return {
      ...data,
      remaining_balance: currentBalance,
    }
  }

  // 근무일 계산 (오프 제외) - 실제 근무표만 확인
  private async calculateWorkingDays(
    startDate: string,
    endDate: string,
    leaveType: string,
    memberId: string,
    deductionDays?: number
  ): Promise<string[]> {
    const workingDays: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    // 실제 근무표에서 해당 기간의 모든 일정 조회
    const { data: schedules } = await supabase
      .from("work_schedule_entries")
      .select("date, work_type_id")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate)
    
    // 날짜별 근무 유형 맵 생성
    const scheduleMap = new Map<string, string>()
    schedules?.forEach(s => scheduleMap.set(s.date, s.work_type_id))

    // 1일이 아닌 휴가는 단일 날짜만 (반차 등)
    if (deductionDays && deductionDays !== 1) {
      const workType = scheduleMap.get(startDate)
      // 오프가 아닌 경우 (근무표 없음, pending, 실제 근무 모두 포함)
      if (workType !== "off") {
        workingDays.push(startDate)
      }
      return workingDays
    }

    // 연차는 범위 내 모든 근무일
    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      const workType = scheduleMap.get(dateStr)
      
      // 오프가 아닌 경우 (근무표 없음, pending, 실제 근무 모두 포함)
      if (workType !== "off") {
        workingDays.push(dateStr)
      }
      
      current.setDate(current.getDate() + 1)
    }

    return workingDays
  }

  // 연차 소모량 계산
  private calculateLeaveDays(workingDays: string[], deductionDays: number = 1): number {
    return workingDays.length * deductionDays
  }

  // 요일 변환
  private getDayOfWeek(date: Date): string {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return days[date.getDay()]
  }

  // 일별 휴가 중복 확인 (대기중 또는 승인된 휴가가 있으면 차단)
  private async checkDailyLeaveLimit(
    memberId: string, 
    startDate: string, 
    endDate: string, 
    leaveType: LeaveType
  ): Promise<boolean> {
    console.log(`일별 휴가 중복 확인: ${memberId}, ${startDate}~${endDate}, 휴가유형: ${leaveType}`)

    // 신청하려는 기간의 각 날짜를 확인
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      
      // 해당 날짜에 대기중 또는 승인된 휴가가 있는지 확인
      const { data: existingLeaves, error } = await supabase
        .from("leave_requests")
        .select("leave_type, status")
        .eq("member_id", memberId)
        .in("status", ["대기중", "승인됨"])
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)

      if (error) {
        console.error("기존 휴가 조회 오류:", error)
        return false
      }

      // 이미 휴가가 있으면 차단
      if (existingLeaves && existingLeaves.length > 0) {
        console.log(`${dateStr}에 이미 ${existingLeaves[0].status} 상태의 휴가가 있음: ${existingLeaves[0].leave_type}`)
        return true
      }
      
      current.setDate(current.getDate() + 1)
    }

    console.log("모든 날짜에서 휴가 중복 없음")
    return false
  }

  // 근무표에 연차 반영
  private async updateWorkScheduleForLeave(request: LeaveRequest): Promise<void> {
    console.log("근무표에 연차 반영:", request)

    // work_types 테이블에서 연차 유형별 ID 조회 (is_leave가 true인 것들)
    const { data: workTypes, error } = await supabase
      .from("work_types")
      .select("id, name")
      .eq("is_leave", true)

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
      
      // 해당 날짜의 기존 근무표 확인
      const { data: existingSchedule } = await supabase
        .from("work_schedule_entries")
        .select("id, work_type_id")
        .eq("member_id", request.member_id)
        .eq("date", dateStr)
        .single()
      
      // 오프가 아닌 경우만 연차로 업데이트
      if (existingSchedule?.work_type_id !== "off") {
        try {
          if (existingSchedule) {
            // 기존 근무가 있으면 백업 후 업데이트
            await supabase
              .from("work_schedule_entries")
              .update({
                work_type_id: workTypeId,
                original_work_type_id: existingSchedule.work_type_id, // 원래 근무 백업
                replaced_by_leave_id: request.id // 연차 신청 ID 저장
              })
              .eq("id", existingSchedule.id)
          } else {
            // 기존 근무가 없으면 새로 생성
            await supabase
              .from("work_schedule_entries")
              .insert({
                member_id: request.member_id,
                date: dateStr,
                work_type_id: workTypeId,
                replaced_by_leave_id: request.id
              })
          }
        } catch (error) {
          console.error(`근무표 업데이트 오류 (${dateStr}):`, error)
        }
      } else {
        console.log(`${dateStr}는 오프이므로 건너뜀입니다`)
      }
      
      current.setDate(current.getDate() + 1)
    }
  }

  // 근무표에서 연차 제거 (단순 삭제 - 이전 버전 호환용)
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

  // 근무표 복구 (연차 취소 시 기존 근무표 복원)
  private async restoreWorkScheduleForLeave(request: LeaveRequest): Promise<{ message?: string }> {
    console.log("근무표 복구 처리:", request)

    // 해당 연차 신청으로 대체된 모든 근무표 항목 조회
    const { data: schedules, error } = await supabase
      .from("work_schedule_entries")
      .select("id, date, original_work_type_id")
      .eq("replaced_by_leave_id", request.id)
    
    if (error) {
      console.error("근무표 조회 오류:", error)
      return {}
    }

    if (!schedules || schedules.length === 0) {
      console.log("복구할 근무표가 없습니다")
      return {}
    }

    const datesWithNoOriginalSchedule: string[] = []

    // 각 날짜별로 원래 근무로 복구
    for (const schedule of schedules) {
      try {
        if (schedule.original_work_type_id) {
          // 원래 근무가 있었으면 복구
          console.log(`${schedule.date}: ${schedule.original_work_type_id}로 복구`)
          await supabase
            .from("work_schedule_entries")
            .update({
              work_type_id: schedule.original_work_type_id,
              original_work_type_id: null,
              replaced_by_leave_id: null
            })
            .eq("id", schedule.id)
        } else {
          // 원래 근무가 없었으면 삭제하고 날짜 기록
          console.log(`${schedule.date}: 삭제 (원래 없었음)`)
          datesWithNoOriginalSchedule.push(schedule.date)
          await supabase
            .from("work_schedule_entries")
            .delete()
            .eq("id", schedule.id)
        }
      } catch (error) {
        console.error(`근무표 복구 오류 (${schedule.date}):`, error)
      }
    }
    
    // 근무표가 없었던 날짜들이 있으면 알림 반환
    if (datesWithNoOriginalSchedule.length > 0) {
      const dateList = datesWithNoOriginalSchedule
        .map(date => new Date(date).toLocaleDateString("ko-KR"))
        .join(", ")
      
      console.warn(
        `📢 주의: 다음 날짜들은 원래 근무표가 등록되지 않았던 날짜입니다. 근무표 등록이 필요합니다:\n` +
        datesWithNoOriginalSchedule.map(date => `- ${date}`).join('\n')
      )
      
      return {
        message: `⚠️ 연차가 취소되었습니다.\n\n다음 날짜들은 원래 근무표가 등록되지 않았던 날짜입니다:\n${dateList}\n\n근무표 관리에서 해당 날짜의 근무를 등록해주세요.`
      }
    }
    
    console.log("근무표 복구 완료")
    return {}
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
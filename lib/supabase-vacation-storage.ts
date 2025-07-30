import { supabase } from "./supabase"
import type { Database } from "@/types/database"

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"]
type VacationRequestInsert = Database["public"]["Tables"]["vacation_requests"]["Insert"]
type VacationRequestUpdate = Database["public"]["Tables"]["vacation_requests"]["Update"]

type VacationAllowance = Database["public"]["Tables"]["vacation_allowances"]["Row"]
type VacationAllowanceInsert = Database["public"]["Tables"]["vacation_allowances"]["Insert"]
type VacationAllowanceUpdate = Database["public"]["Tables"]["vacation_allowances"]["Update"]

export const supabaseVacationStorage = {
  // 휴가 신청 관련
  async getVacationRequests(): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching vacation requests:", error)
      return []
    }

    return data || []
  },

  async addVacationRequest(
    request: Omit<VacationRequestInsert, "id" | "created_at" | "updated_at">,
  ): Promise<VacationRequest | null> {
    const { data, error } = await supabase.from("vacation_requests").insert(request).select().single()

    if (error) {
      console.error("Error adding vacation request:", error)
      return null
    }

    return data
  },

  async updateVacationRequest(id: string, updates: Partial<VacationRequestUpdate>): Promise<VacationRequest | null> {
    const { data, error } = await supabase.from("vacation_requests").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating vacation request:", error)
      return null
    }

    return data
  },

  async deleteVacationRequest(id: string): Promise<boolean> {
    const { error } = await supabase.from("vacation_requests").delete().eq("id", id)

    if (error) {
      console.error("Error deleting vacation request:", error)
      return false
    }

    return true
  },

  async cancelVacationRequest(id: string, isAdmin = false): Promise<boolean> {
    try {
      // 먼저 요청 정보를 가져와서 상태 확인
      const { data: request, error: fetchError } = await supabase
        .from("vacation_requests")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError || !request) {
        console.error("Error fetching vacation request:", fetchError)
        return false
      }

      // 취소 가능한 상태인지 확인
      if (request.status === "cancelled" || request.status === "rejected") {
        console.error("Cannot cancel request with status:", request.status)
        return false
      }

      // 승인된 경우 권한별 취소 조건 확인
      if (request.status === "approved" && !isAdmin) {
        // 일반 직원의 경우: 휴가 시작일이 현재보다 이후인지 확인
        const today = new Date()
        const startDate = new Date(request.start_date)
        if (startDate <= today) {
          console.error("Cannot cancel approved request that has already started (employee)")
          return false
        }
      }
      // 관리자의 경우: 승인된 휴가를 언제든 취소 가능 (추가 조건 없음)

      // 상태를 취소로 변경
      const { error: updateError } = await supabase
        .from("vacation_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) {
        console.error("Error cancelling vacation request:", updateError)
        return false
      }

      // 승인된 휴가를 취소하는 경우 연차 사용량 업데이트
      if (request.status === "approved") {
        await this.updateVacationUsage(request.member_id, new Date(request.start_date).getFullYear())
      }

      return true
    } catch (error) {
      console.error("Error in cancelVacationRequest:", error)
      return false
    }
  },

  // 휴가 부여 관련
  async getVacationAllowances(): Promise<VacationAllowance[]> {
    const { data, error } = await supabase.from("vacation_allowances").select("*").order("year", { ascending: false })

    if (error) {
      console.error("Error fetching vacation allowances:", error)
      return []
    }

    return data || []
  },

  async updateVacationAllowance(
    memberId: string,
    year: number,
    updates: Partial<VacationAllowanceUpdate>,
  ): Promise<VacationAllowance | null> {
    const { data, error } = await supabase
      .from("vacation_allowances")
      .update(updates)
      .eq("member_id", memberId)
      .eq("year", year)
      .select()
      .single()

    if (error) {
      console.error("Error updating vacation allowance:", error)
      return null
    }

    return data
  },

  async updateVacationAllowanceDays(
    memberId: string,
    year: number,
    totalDays: number,
  ): Promise<VacationAllowance | null> {
    // 기존 부여 내역 확인
    const { data: existing } = await supabase
      .from("vacation_allowances")
      .select("*")
      .eq("member_id", memberId)
      .eq("year", year)
      .single()

    if (existing) {
      // 기존 데이터 업데이트
      const { data, error } = await supabase
        .from("vacation_allowances")
        .update({
          total_days: totalDays,
          remaining_days: totalDays - existing.used_days,
        })
        .eq("member_id", memberId)
        .eq("year", year)
        .select()
        .single()

      if (error) {
        console.error("Error updating vacation allowance days:", error)
        return null
      }

      return data
    } else {
      // 새로운 부여 내역 생성
      const { data: member } = await supabase.from("members").select("name, team_name").eq("id", memberId).single()

      if (!member) return null

      const { data, error } = await supabase
        .from("vacation_allowances")
        .insert({
          member_id: memberId,
          member_name: member.name,
          team_name: member.team_name || "",
          year,
          total_days: totalDays,
          used_days: 0,
          remaining_days: totalDays,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating vacation allowance:", error)
        return null
      }

      return data
    }
  },

  async ensureVacationAllowances(year: number): Promise<void> {
    const { data: members } = await supabase.from("members").select("id, name, team_name")

    if (!members) return

    const { data: existingAllowances } = await supabase.from("vacation_allowances").select("member_id").eq("year", year)

    const existingMemberIds = new Set(existingAllowances?.map((a) => a.member_id) || [])

    const newAllowances = members
      .filter((member) => !existingMemberIds.has(member.id))
      .map((member) => ({
        member_id: member.id,
        member_name: member.name,
        team_name: member.team_name || "",
        year,
        total_days: 15,
        used_days: 0,
        remaining_days: 15,
      }))

    if (newAllowances.length > 0) {
      const { error } = await supabase.from("vacation_allowances").insert(newAllowances)

      if (error) {
        console.error("Error ensuring vacation allowances:", error)
      }
    }
  },

  async calculateVacationDays(
    memberId: string,
    startDate: string,
    endDate: string,
    type: "annual" | "morning_half" | "afternoon_half",
  ): Promise<number> {
    if (type === "morning_half" || type === "afternoon_half") {
      return 0.5
    }

    // 구성원의 주간 근무 스케줄 가져오기
    const { data: member, error } = await supabase.from("members").select("weekly_schedule").eq("id", memberId).single()

    if (error || !member) {
      console.error("Error fetching member schedule:", error)
      // 오류 시 기본 계산 (주말 제외)
      return this.calculateWorkingDaysBasic(startDate, endDate)
    }

    const weeklySchedule = member.weekly_schedule
    const start = new Date(startDate)
    const end = new Date(endDate)
    let workingDays = 0

    // 시작일부터 종료일까지 하루씩 확인
    for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayOfWeek = currentDate.getDay() // 0: 일요일, 1: 월요일, ..., 6: 토요일
      const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const dayKey = dayKeys[dayOfWeek]

      // 해당 요일의 근무 유형 확인
      const workTypeId = weeklySchedule[dayKey]

      // "off"가 아닌 경우만 근무일로 계산
      if (workTypeId && workTypeId !== "off") {
        workingDays++
      }
    }

    return workingDays
  },

  // 기본 근무일 계산 (주말 제외, 오류 시 사용)
  calculateWorkingDaysBasic(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    let workingDays = 0

    for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayOfWeek = currentDate.getDay()
      // 주말(토요일: 6, 일요일: 0) 제외
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++
      }
    }

    return workingDays
  },

  async updateVacationUsage(memberId: string, year: number): Promise<void> {
    // 해당 연도의 승인된 휴가 신청들의 총 사용일수 계산 (취소된 것 제외)
    const { data: approvedRequests } = await supabase
      .from("vacation_requests")
      .select("days")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`)

    const totalUsedDays = approvedRequests?.reduce((sum, req) => sum + req.days, 0) || 0

    // 휴가 부여 내역 업데이트
    const { data: allowance } = await supabase
      .from("vacation_allowances")
      .select("total_days")
      .eq("member_id", memberId)
      .eq("year", year)
      .single()

    if (allowance) {
      await supabase
        .from("vacation_allowances")
        .update({
          used_days: totalUsedDays,
          remaining_days: allowance.total_days - totalUsedDays,
        })
        .eq("member_id", memberId)
        .eq("year", year)
    }
  },

  async getVacationUsageDetails(memberId: string, year: number) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`)
      .order("start_date", { ascending: false })

    if (error) {
      console.error("Error fetching vacation usage details:", error)
      return []
    }

    return (
      data?.map((req) => ({
        requestId: req.id,
        type: req.type,
        start_date: req.start_date, // 필드명을 데이터베이스와 일치시킴
        end_date: req.end_date, // 필드명을 데이터베이스와 일치시킴
        days: req.days,
        status: req.status as "approved",
        approved_at: req.approved_at || "", // 필드명을 데이터베이스와 일치시킴
        reason: req.reason,
      })) || []
    )
  },

  async getVacationAllowancesByYear(year: number): Promise<VacationAllowance[]> {
    const { data, error } = await supabase.from("vacation_allowances").select("*").eq("year", year).order("member_name")

    if (error) {
      console.error("Error fetching vacation allowances by year:", error)
      return []
    }

    return data || []
  },

  async getVacationRequestsByMember(memberId: string, isAdmin = false): Promise<VacationRequest[]> {
    let query = supabase.from("vacation_requests").select("*").order("created_at", { ascending: false })

    if (!isAdmin) {
      query = query.eq("member_id", memberId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching vacation requests by member:", error)
      return []
    }

    return data || []
  },

  async getPendingVacationRequests(): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching pending vacation requests:", error)
      return []
    }

    return data || []
  },
}

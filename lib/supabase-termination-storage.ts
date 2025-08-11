import { supabase } from "./supabase"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]
type TerminationLog = Database["public"]["Tables"]["termination_logs"]["Row"]

export const supabaseTerminationStorage = {
  // 활성 구성원 목록 조회 (퇴사자 제외)
  async getActiveMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("활성 구성원 조회 오류:", error)
      throw error
    }

    return data || []
  },

  // 퇴사자 목록 조회
  async getTerminatedMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("status", "terminated")
      .order("termination_date", { ascending: false })

    if (error) {
      console.error("퇴사자 조회 오류:", error)
      throw error
    }

    return data || []
  },

  // 구성원 퇴사 처리
  async terminateMember(
    memberId: string,
    terminationDate: string,
    terminationReason: string,
    createdBy: string,
  ): Promise<void> {
    try {
      // 1. 구성원 상태 업데이트
      const { error: memberError } = await supabase
        .from("members")
        .update({
          status: "terminated",
          termination_date: terminationDate,
          termination_reason: terminationReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId)

      if (memberError) {
        console.error("구성원 퇴사 처리 오류:", memberError)
        throw memberError
      }

      // 2. 퇴사 로그 기록
      const { error: logError } = await supabase.from("termination_logs").insert({
        member_id: memberId,
        action: "terminate",
        termination_date: terminationDate,
        termination_reason: terminationReason,
        created_by: createdBy,
      })

      if (logError) {
        console.error("퇴사 로그 기록 오류:", logError)
        throw logError
      }
    } catch (error) {
      console.error("퇴사 처리 실패:", error)
      throw error
    }
  },

  // 퇴사 취소 (재직 상태 복구)
  async cancelTermination(memberId: string, cancellationReason: string, createdBy: string): Promise<void> {
    try {
      // 1. 구성원 상태 복구
      const { error: memberError } = await supabase
        .from("members")
        .update({
          status: "active",
          termination_date: null,
          termination_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId)

      if (memberError) {
        console.error("퇴사 취소 처리 오류:", memberError)
        throw memberError
      }

      // 2. 취소 로그 기록
      const { error: logError } = await supabase.from("termination_logs").insert({
        member_id: memberId,
        action: "cancel",
        cancellation_reason: cancellationReason,
        created_by: createdBy,
      })

      if (logError) {
        console.error("취소 로그 기록 오류:", logError)
        throw logError
      }
    } catch (error) {
      console.error("퇴사 취소 실패:", error)
      throw error
    }
  },

  // 구성원의 퇴사 로그 조회
  async getTerminationLogs(memberId: string): Promise<TerminationLog[]> {
    const { data, error } = await supabase
      .from("termination_logs")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("퇴사 로그 조회 오류:", error)
      throw error
    }

    return data || []
  },

  // 퇴사일 유효성 검사
  async validateTerminationDate(
    memberId: string,
    terminationDate: string,
  ): Promise<{
    isValid: boolean
    message: string
  }> {
    try {
      // 구성원 정보 조회
      const { data: member, error } = await supabase
        .from("members")
        .select("join_date, status")
        .eq("id", memberId)
        .single()

      if (error || !member) {
        return { isValid: false, message: "구성원을 찾을 수 없습니다." }
      }

      // 이미 퇴사 처리된 경우
      if (member.status === "terminated") {
        return { isValid: false, message: "이미 퇴사 처리된 구성원입니다." }
      }

      // 퇴사일이 입사일보다 이른 경우
      const joinDate = new Date(member.join_date)
      const termDate = new Date(terminationDate)

      if (termDate < joinDate) {
        return { isValid: false, message: "퇴사일은 입사일보다 늦어야 합니다." }
      }

      // 미래 날짜인 경우 (오늘까지는 허용)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // 오늘 끝까지 허용

      if (termDate > today) {
        return { isValid: false, message: "퇴사일은 오늘 이후로 설정할 수 없습니다." }
      }

      return { isValid: true, message: "유효한 퇴사일입니다." }
    } catch (error) {
      console.error("퇴사일 유효성 검사 오류:", error)
      return { isValid: false, message: "유효성 검사 중 오류가 발생했습니다." }
    }
  },
}

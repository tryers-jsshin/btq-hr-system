import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import { hashPassword, isPasswordHashed } from "./password-utils"

type Member = Database["public"]["Tables"]["members"]["Row"]
type MemberInsert = Database["public"]["Tables"]["members"]["Insert"]
type MemberUpdate = Database["public"]["Tables"]["members"]["Update"]

export const supabaseMemberStorage = {
  // 활성 구성원만 조회 (퇴사자 제외)
  async getMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("구성원 조회 오류:", error)
      throw error
    }

    return data || []
  },

  // 모든 구성원 조회 (상태 무관)
  async getAllMembers(): Promise<Member[]> {
    const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("전체 구성원 조회 오류:", error)
      throw error
    }

    return data || []
  },

  async getMemberById(id: string): Promise<Member | null> {
    const { data, error } = await supabase.from("members").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("구성원 조회 오류:", error)
      throw error
    }

    return data
  },

  async createMember(member: Omit<MemberInsert, "id" | "created_at" | "updated_at" | "password">): Promise<Member> {
    // 전화번호에서 하이픈 제거하여 초기 비밀번호로 사용하고 해시화
    const phoneNumbersOnly = member.phone.replace(/[^\d]/g, "")
    const hashedPassword = await hashPassword(phoneNumbersOnly)

    const { data, error } = await supabase
      .from("members")
      .insert({
        ...member,
        password: hashedPassword,
        status: "active", // 새 구성원은 기본적으로 활성 상태
      })
      .select()
      .single()

    if (error) {
      console.error("구성원 생성 오류:", error)
      throw error
    }

    return data
  },

  async updateMember(
    id: string,
    updates: Omit<MemberUpdate, "id" | "created_at" | "updated_at" | "password">,
  ): Promise<Member> {
    const { data, error } = await supabase
      .from("members")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("구성원 수정 오류:", error)
      throw error
    }

    return data
  },

  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase.from("members").delete().eq("id", id)

    if (error) {
      console.error("구성원 삭제 오류:", error)
      throw error
    }
  },

  async isEmployeeNumberExists(employeeNumber: string, excludeId?: string): Promise<boolean> {
    let query = supabase.from("members").select("id").eq("employee_number", employeeNumber)

    if (excludeId) {
      query = query.neq("id", excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error("사원번호 중복 확인 오류:", error)
      return false
    }

    return (data?.length || 0) > 0
  },

  async changePassword(
    memberId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 현재 구성원 정보 조회
      const member = await this.getMemberById(memberId)
      if (!member) {
        return { success: false, message: "구성원을 찾을 수 없습니다." }
      }

      // 현재 비밀번호 확인 - 하이픈 제거된 버전도 확인
      const currentPasswordHash = await hashPassword(currentPassword)
      const currentPasswordNoHyphenHash = await hashPassword(currentPassword.replace(/[^\d]/g, ""))

      // 저장된 비밀번호가 해시화되어 있는지 확인
      const isStoredPasswordHashed = isPasswordHashed(member.password)

      let isCurrentPasswordValid = false
      if (isStoredPasswordHashed) {
        // 해시화된 비밀번호와 비교 (하이픈 있는 버전과 없는 버전 모두 확인)
        isCurrentPasswordValid =
          member.password === currentPasswordHash || member.password === currentPasswordNoHyphenHash
      } else {
        // 평문 비밀번호와 비교 (기존 데이터 호환성)
        const phoneNumbersOnly = member.phone.replace(/[^\d]/g, "")
        isCurrentPasswordValid = member.password === currentPassword || member.password === phoneNumbersOnly
      }

      if (!isCurrentPasswordValid) {
        return { success: false, message: "현재 비밀번호가 올바르지 않습니다." }
      }

      // 새 비밀번호 해시화
      const newPasswordHash = await hashPassword(newPassword)

      // 비밀번호 업데이트 (password 필드 직접 업데이트)
      const { data, error } = await supabase
        .from("members")
        .update({
          password: newPasswordHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId)
        .select()
        .single()

      if (error) {
        console.error("비밀번호 업데이트 오류:", error)
        throw error
      }

      return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." }
    } catch (error) {
      console.error("비밀번호 변경 오류:", error)
      return { success: false, message: "비밀번호 변경 중 오류가 발생했습니다." }
    }
  },
}

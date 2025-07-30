import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import { hashPassword, isPasswordHashed } from "./password-utils"

type Member = Database["public"]["Tables"]["members"]["Row"]
type MemberInsert = Database["public"]["Tables"]["members"]["Insert"]
type MemberUpdate = Database["public"]["Tables"]["members"]["Update"]

export const supabaseMemberStorage = {
  async getMembers(): Promise<Member[]> {
    const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("구성원 조회 오류:", error)
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

  async createMember(member: Omit<MemberInsert, "id" | "created_at" | "updated_at">): Promise<Member> {
    // 전화번호를 초기 비밀번호로 사용하고 해시화
    const hashedPassword = await hashPassword(member.phone)

    const { data, error } = await supabase
      .from("members")
      .insert({
        ...member,
        password: hashedPassword,
      })
      .select()
      .single()

    if (error) {
      console.error("구성원 생성 오류:", error)
      throw error
    }

    return data
  },

  async updateMember(id: string, updates: MemberUpdate): Promise<Member> {
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

      // 현재 비밀번호 확인
      const currentPasswordHash = await hashPassword(currentPassword)

      // 저장된 비밀번호가 해시화되어 있는지 확인
      const isStoredPasswordHashed = isPasswordHashed(member.password)

      let isCurrentPasswordValid = false
      if (isStoredPasswordHashed) {
        // 해시화된 비밀번호와 비교
        isCurrentPasswordValid = member.password === currentPasswordHash
      } else {
        // 평문 비밀번호와 비교 (기존 데이터 호환성)
        isCurrentPasswordValid = member.password === currentPassword
      }

      if (!isCurrentPasswordValid) {
        return { success: false, message: "현재 비밀번호가 올바르지 않습니다." }
      }

      // 새 비밀번호 해시화
      const newPasswordHash = await hashPassword(newPassword)

      // 비밀번호 업데이트
      await this.updateMember(memberId, { password: newPasswordHash })

      return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." }
    } catch (error) {
      console.error("비밀번호 변경 오류:", error)
      return { success: false, message: "비밀번호 변경 중 오류가 발생했습니다." }
    }
  },

  async migratePasswordsToHash(): Promise<{ success: boolean; message: string; migratedCount: number }> {
    try {
      const members = await this.getMembers()
      let migratedCount = 0

      for (const member of members) {
        // 이미 해시화된 비밀번호는 건너뛰기
        if (isPasswordHashed(member.password)) {
          continue
        }

        // 평문 비밀번호를 해시화
        const hashedPassword = await hashPassword(member.password)

        await this.updateMember(member.id, { password: hashedPassword })
        migratedCount++
      }

      return {
        success: true,
        message: `${migratedCount}개의 비밀번호가 성공적으로 해시화되었습니다.`,
        migratedCount,
      }
    } catch (error) {
      console.error("비밀번호 마이그레이션 오류:", error)
      return {
        success: false,
        message: "비밀번호 마이그레이션 중 오류가 발생했습니다.",
        migratedCount: 0,
      }
    }
  },
}

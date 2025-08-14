import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import { hashPassword, isPasswordHashed } from "./password-utils"

type Member = Database["public"]["Tables"]["members"]["Row"]

export const supabaseAuthStorage = {
  async login(employeeNumber: string, password: string): Promise<{ success: boolean; user?: Member; message: string }> {
    try {
      const { data, error } = await supabase.from("members").select("*").eq("employee_number", employeeNumber).single()

      if (error || !data) {
        return { success: false, message: "사원번호 또는 비밀번호가 올바르지 않습니다." }
      }

      // 퇴사자 로그인 차단
      if (data.status === "terminated") {
        return { success: false, message: "퇴사 처리된 계정입니다. 로그인할 수 없습니다." }
      }

      // 입력된 비밀번호 해시화 (하이픈 제거된 버전도 준비)
      const inputPasswordHash = await hashPassword(password)
      const inputPasswordNoHyphenHash = await hashPassword(password.replace(/[^\d]/g, ""))

      // 저장된 비밀번호가 해시화되어 있는지 확인
      const isStoredPasswordHashed = isPasswordHashed(data.password)

      let isPasswordValid = false
      if (isStoredPasswordHashed) {
        // 해시화된 비밀번호와 비교 (하이픈 있는 버전과 없는 버전 모두 확인)
        isPasswordValid = data.password === inputPasswordHash || data.password === inputPasswordNoHyphenHash
      } else {
        // 평문 비밀번호와 비교 (기존 데이터 호환성)
        const phoneNumbersOnly = data.phone.replace(/[^\d]/g, "")
        isPasswordValid = data.password === password || data.password === phoneNumbersOnly

        // 로그인 성공 시 비밀번호를 해시화하여 업데이트 (하이픈 제거된 전화번호 사용)
        if (isPasswordValid) {
          const hashedPassword = await hashPassword(phoneNumbersOnly)
          await supabase.from("members").update({ password: hashedPassword }).eq("id", data.id)
        }
      }

      if (!isPasswordValid) {
        return { success: false, message: "사원번호 또는 비밀번호가 올바르지 않습니다." }
      }

      // 로그인 성공
      if (typeof window !== "undefined") {
        localStorage.setItem("currentUser", JSON.stringify(data))
      }

      return { success: true, user: data, message: "환영합니다!" }
    } catch (error) {
      console.error("로그인 오류:", error)
      return { success: false, message: "로그인 중 오류가 발생했습니다." }
    }
  },

  async getCurrentUser(): Promise<Member | null> {
    if (typeof window === "undefined") return null

    const userStr = localStorage.getItem("currentUser")
    if (!userStr) return null

    try {
      const user = JSON.parse(userStr)
      // 사용자 정보가 최신인지 확인
      const { data } = await supabase.from("members").select("*").eq("id", user.id).single()

      if (data) {
        // 퇴사자인 경우 로그아웃 처리
        if (data.status === "terminated") {
          await this.logout()
          return null
        }

        // 최신 정보로 localStorage 업데이트
        localStorage.setItem("currentUser", JSON.stringify(data))
        return data
      }

      return user
    } catch {
      return null
    }
  },

  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  },

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser")
    }
  },
}

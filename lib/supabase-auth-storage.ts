import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import { hashPassword, isPasswordHashed } from "./password-utils"

type Member = Database["public"]["Tables"]["members"]["Row"]

export const supabaseAuthStorage = {
  async login(email: string, password: string): Promise<{ success: boolean; user?: Member; message: string }> {
    try {
      const { data, error } = await supabase.from("members").select("*").eq("email", email).single()

      if (error || !data) {
        return { success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }
      }

      // 입력된 비밀번호 해시화
      const inputPasswordHash = await hashPassword(password)

      // 저장된 비밀번호가 해시화되어 있는지 확인
      const isStoredPasswordHashed = isPasswordHashed(data.password)

      let isPasswordValid = false
      if (isStoredPasswordHashed) {
        // 해시화된 비밀번호와 비교
        isPasswordValid = data.password === inputPasswordHash
      } else {
        // 평문 비밀번호와 비교 (기존 데이터 호환성)
        isPasswordValid = data.password === password

        // 로그인 성공 시 비밀번호를 해시화하여 업데이트
        if (isPasswordValid) {
          await supabase.from("members").update({ password: inputPasswordHash }).eq("id", data.id)
        }
      }

      if (!isPasswordValid) {
        return { success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }
      }

      // 로그인 성공
      if (typeof window !== "undefined") {
        localStorage.setItem("currentUser", JSON.stringify(data))
      }

      return { success: true, user: data, message: "로그인 성공" }
    } catch (error) {
      console.error("로그인 오류:", error)
      return { success: false, message: "로그인 중 오류가 발생했습니다." }
    }
  },

  async isLoggedIn(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      return user !== null
    } catch (error) {
      console.error("로그인 상태 확인 오류:", error)
      return false
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
        // 최신 정보로 localStorage 업데이트
        localStorage.setItem("currentUser", JSON.stringify(data))
        return data
      }

      return user
    } catch {
      return null
    }
  },

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser")
    }
  },
}

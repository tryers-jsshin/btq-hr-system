import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import type { AnnualLeaveBalance, AnnualLeaveTransaction, AnnualLeavePolicy } from "@/types/annual-leave"

export const supabaseAnnualLeaveStorage = {
  // 정책 관리
  async getActivePolicy(): Promise<AnnualLeavePolicy | null> {
    const { data, error } = await supabase.from("annual_leave_policies").select("*").eq("is_active", true).single()

    if (error) {
      if (error.code === "PGRST116") return null
      console.error("활성 정책 조회 오류:", error)
      throw error
    }

    return data as AnnualLeavePolicy
  },

  async getAllPolicies(): Promise<AnnualLeavePolicy[]> {
    const { data, error } = await supabase
      .from("annual_leave_policies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("정책 목록 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeavePolicy[]) || []
  },

  async createPolicy(policy: Omit<AnnualLeavePolicy, "id" | "created_at" | "updated_at">): Promise<AnnualLeavePolicy> {
    const { data, error } = await supabase.from("annual_leave_policies").insert(policy).select().single()

    if (error) {
      console.error("정책 생성 오류:", error)
      throw error
    }

    return data as AnnualLeavePolicy
  },

  async updatePolicy(id: string, updates: Partial<AnnualLeavePolicy>): Promise<AnnualLeavePolicy> {
    const { data, error } = await supabase
      .from("annual_leave_policies")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("정책 수정 오류:", error)
      throw error
    }

    return data as AnnualLeavePolicy
  },

  // 잔액 관리
  async getAllBalances(): Promise<AnnualLeaveBalance[]> {
    const { data, error } = await supabase.from("annual_leave_balances").select("*").order("member_name")

    if (error) {
      console.error("잔액 목록 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveBalance[]) || []
  },

  // 모든 활성 구성원의 연차 현황 조회 (연차 잔액이 없는 구성원도 포함)
  async getAllActiveMemberBalances(): Promise<AnnualLeaveBalance[]> {
    console.log("모든 활성 구성원의 연차 현황 조회 시작")

    // 활성 구성원 목록 조회
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, name, team_name, join_date")
      .eq("status", "active")
      .order("name")

    if (membersError) {
      console.error("활성 구성원 조회 오류:", membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      console.log("활성 구성원이 없습니다")
      return []
    }

    console.log(`활성 구성원 ${members.length}명 조회됨`)

    // 각 구성원의 연차 잔액 조회 또는 생성
    const balances: AnnualLeaveBalance[] = []

    for (const member of members) {
      // 기존 잔액 조회
      const { data: existingBalance } = await supabase
        .from("annual_leave_balances")
        .select("*")
        .eq("member_id", member.id)
        .single()

      if (existingBalance) {
        // 기존 잔액이 있는 경우
        balances.push(existingBalance as AnnualLeaveBalance)
      } else {
        // 기존 잔액이 없는 경우 기본 잔액 생성
        const defaultBalance: AnnualLeaveBalance = {
          id: `temp_${member.id}`, // 임시 ID
          member_id: member.id,
          member_name: member.name,
          team_name: member.team_name || "",
          join_date: member.join_date,
          total_granted: 0,
          total_used: 0,
          total_expired: 0,
          current_balance: 0,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        balances.push(defaultBalance)
      }
    }

    console.log(`총 ${balances.length}명의 연차 현황 조회 완료`)
    return balances
  },

  async getBalanceByMemberId(memberId: string): Promise<AnnualLeaveBalance | null> {
    const { data, error } = await supabase.from("annual_leave_balances").select("*").eq("member_id", memberId).single()

    if (error) {
      if (error.code === "PGRST116") return null
      console.error("구성원 잔액 조회 오류:", error)
      throw error
    }

    return data as AnnualLeaveBalance
  },

  async upsertBalance(
    balance: Omit<AnnualLeaveBalance, "id" | "created_at" | "updated_at">,
  ): Promise<AnnualLeaveBalance> {
    console.log("잔액 업데이트 시도:", balance)

    const { data, error } = await supabase
      .from("annual_leave_balances")
      .upsert(
        {
          ...balance,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("잔액 업데이트 오류:", error)
      throw error
    }

    console.log("잔액 업데이트 성공:", data)
    return data as AnnualLeaveBalance
  },

  // 거래 내역 관리
  async getTransactionsByMemberId(memberId: string): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("거래 내역 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  },

  async getAllTransactions(): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("전체 거래 내역 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  },

  async createTransaction(
    transaction: Omit<AnnualLeaveTransaction, "id" | "created_at" | "updated_at">,
  ): Promise<AnnualLeaveTransaction> {
    console.log("거래 내역 생성 시도:", transaction)

    const { data, error } = await supabase.from("annual_leave_transactions").insert(transaction).select().single()

    if (error) {
      console.error("거래 내역 생성 오류 상세 정보:")
      console.error("- 오류 코드:", error.code)
      console.error("- 오류 메시지:", error.message)
      console.error("- 오류 세부사항:", error.details)
      console.error("- 오류 힌트:", error.hint)
      console.error("- 삽입 데이터:", JSON.stringify(transaction, null, 2))
      throw new Error(`연차 거래 생성 실패: ${error.message}`)
    }

    console.log("거래 내역 생성 성공:", data)
    return data as AnnualLeaveTransaction
  },

  // 만료 예정 연차 조회
  async getExpiringTransactions(expireDate: string): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("transaction_type", "grant")
      .eq("expire_date", expireDate)
      .gt("amount", 0) // 양수인 부여 내역만

    if (error) {
      console.error("만료 예정 연차 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  },

  // 구성원별 미사용 부여 내역 조회 (소멸 계산용)
  async getUnusedGrantsByMemberId(memberId: string): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .eq("transaction_type", "grant")
      .gt("amount", 0)
      .order("grant_date")

    if (error) {
      console.error("미사용 부여 내역 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  },

  // 특정 부여 내역의 사용량 계산
  async getUsedAmountForGrant(memberId: string, grantDate: string): Promise<number> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("amount")
      .eq("member_id", memberId)
      .eq("grant_date", grantDate)
      .in("transaction_type", ["use", "expire"])

    if (error) {
      console.error("부여 내역별 사용량 조회 오류:", error)
      throw error
    }

    return data?.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) || 0
  },

  // 활성 구성원 목록 조회 (연차 계산용)
  async getActiveMembersForLeaveCalculation(): Promise<Database["public"]["Tables"]["members"]["Row"][]> {
    const { data, error } = await supabase.from("members").select("*").eq("status", "active").order("join_date")

    if (error) {
      console.error("활성 구성원 조회 오류:", error)
      throw error
    }

    return data || []
  },

  // 구성원 잔액 업데이트
  async updateMemberBalance(memberId: string): Promise<void> {
    console.log(`=== ${memberId} 잔액 업데이트 시작 ===`)

    const transactions = await this.getTransactionsByMemberId(memberId)
    console.log(`거래 내역 ${transactions.length}건 조회됨`)

    const totalGranted = transactions
      .filter((t) => t.transaction_type === "grant")
      .reduce((sum, t) => sum + t.amount, 0)

    // 사용량 계산: 음수는 사용, 양수는 취소(복구)
    const useTransactions = transactions.filter((t) => t.transaction_type === "use")
    const totalUsed = useTransactions.reduce((sum, t) => {
      if (t.amount < 0) {
        return sum + Math.abs(t.amount) // 음수(사용)를 양수로 변환하여 누적
      } else {
        return sum - t.amount // 양수(취소)는 사용량에서 차감
      }
    }, 0)

    const totalExpired = transactions
      .filter((t) => t.transaction_type === "expire")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalAdjusted = transactions
      .filter((t) => t.transaction_type === "adjust")
      .reduce((sum, t) => sum + t.amount, 0)

    const currentBalance = totalGranted - totalUsed - totalExpired + totalAdjusted

    console.log(`잔액 계산 결과:`)
    console.log(`- 총 부여: ${totalGranted}일`)
    console.log(`- 총 사용: ${totalUsed}일`)
    console.log(`- 총 소멸: ${totalExpired}일`)
    console.log(`- 총 조정: ${totalAdjusted}일`)
    console.log(`- 현재 잔액: ${currentBalance}일`)

    // 구성원 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("name, team_name, join_date")
      .eq("id", memberId)
      .single()

    if (member) {
      console.log(`구성원 정보: ${member.name} (${member.team_name})`)

      await this.upsertBalance({
        member_id: memberId,
        member_name: member.name,
        team_name: member.team_name || "",
        join_date: member.join_date,
        total_granted: totalGranted,
        total_used: totalUsed,
        total_expired: totalExpired,
        current_balance: currentBalance,
        last_updated: new Date().toISOString(),
      })

      console.log(`=== ${member.name} 잔액 업데이트 완료 ===`)
    } else {
      console.error(`구성원 정보를 찾을 수 없음: ${memberId}`)
    }
  },
}

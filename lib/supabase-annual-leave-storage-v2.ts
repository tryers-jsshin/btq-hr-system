import { supabase } from "./supabase"
import type { AnnualLeaveBalance, AnnualLeaveTransaction, AnnualLeavePolicy } from "@/types/annual-leave"
import type { Database } from "@/types/database"

// 새로운 상태 기반 연차 관리 스토리지
class SupabaseAnnualLeaveStorageV2 {
  // 트랜잭션 생성 (status 기본값: active)
  async createTransaction(
    data: Omit<AnnualLeaveTransaction, "id" | "created_at" | "updated_at" | "status" | "cancelled_at" | "cancelled_by">
  ): Promise<void> {
    const { error } = await supabase.from("annual_leave_transactions").insert({
      ...data,
      status: "active",
    })

    if (error) {
      console.error("트랜잭션 생성 오류:", error)
      throw error
    }
  }

  // 트랜잭션 취소 (status를 cancelled로 변경)
  async cancelTransaction(
    transactionId: string,
    cancelledBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from("annual_leave_transactions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
      })
      .eq("id", transactionId)

    if (error) {
      console.error("트랜잭션 취소 오류:", error)
      throw error
    }
  }

  // 연차 사용 취소 (원본 트랜잭션을 cancelled로 변경)
  async cancelUsageTransaction(
    originalUsageId: string,
    cancelledBy: string
  ): Promise<void> {
    await this.cancelTransaction(originalUsageId, cancelledBy)
  }

  // 부여 취소 (원본 부여와 관련 사용 내역 모두 cancelled로 변경)
  async cancelGrantTransaction(
    grantId: string,
    cancelledBy: string
  ): Promise<void> {
    // 1. 부여 자체를 취소
    await this.cancelTransaction(grantId, cancelledBy)

    // 2. 해당 부여를 참조하는 모든 사용 내역도 취소
    const { data: relatedUses, error } = await supabase
      .from("annual_leave_transactions")
      .select("id")
      .eq("reference_id", grantId)
      .eq("transaction_type", "use")
      .or('status.eq.active,status.is.null')

    if (error) {
      console.error("관련 사용 내역 조회 오류:", error)
      throw error
    }

    // 관련 사용 내역들도 모두 취소
    for (const use of relatedUses || []) {
      await this.cancelTransaction(use.id, cancelledBy)
    }
  }

  // 활성 트랜잭션만 조회
  async getActiveTransactionsByMemberId(memberId: string): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .or('status.eq.active,status.is.null')
      .order("created_at", { ascending: false })

    if (error) {
      console.error("활성 거래 내역 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  }
  
  // 모든 거래 내역 조회 (cancelled 포함) - 부여 중복 확인용
  async getAllTransactionsByMemberId(memberId: string): Promise<AnnualLeaveTransaction[]> {
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("전체 거래 내역 조회 오류:", error)
      throw error
    }

    return (data as AnnualLeaveTransaction[]) || []
  }

  // 잔액 계산 (활성 트랜잭션만 사용)
  async calculateBalance(memberId: string): Promise<{
    totalGranted: number
    totalUsed: number
    totalExpired: number
    currentBalance: number
  }> {
    const transactions = await this.getActiveTransactionsByMemberId(memberId)
    
    console.log(`[V2] ${memberId}의 활성 트랜잭션 ${transactions.length}개:`)
    transactions.forEach(t => {
      console.log(`  - ${t.transaction_type}: ${t.amount}일, status: ${t.status || 'active'}, reason: ${t.reason}`)
    })
    
    // 부여 계산 (소멸되지 않은 것만)
    const grantTransactions = transactions.filter(t => 
      (t.transaction_type === "grant" || t.transaction_type === "manual_grant") &&
      !t.is_expired  // 소멸되지 않은 부여만 계산
    )
    const totalGranted = grantTransactions.reduce((sum, t) => sum + t.amount, 0)
    console.log(`[V2] 활성 부여 트랜잭션 ${grantTransactions.length}개, 총 ${totalGranted}일`)

    // 소멸된 부여 계산
    const expiredGrants = transactions.filter(t => 
      (t.transaction_type === "grant" || t.transaction_type === "manual_grant") &&
      t.is_expired === true
    )
    const totalExpired = expiredGrants.reduce((sum, t) => sum + t.amount, 0)
    console.log(`[V2] 소멸된 부여 ${expiredGrants.length}개, 총 ${totalExpired}일`)

    // 사용 계산 (음수)
    const useTransactions = transactions.filter(t => t.transaction_type === "use")
    const totalUsed = useTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    console.log(`[V2] 사용 트랜잭션 ${useTransactions.length}개, 총 ${totalUsed}일`)

    // 조정 계산
    const adjustTransactions = transactions.filter(t => t.transaction_type === "adjust")
    const totalAdjusted = adjustTransactions.reduce((sum, t) => sum + t.amount, 0)

    // 현재 잔액 = 활성 부여 - 사용 + 조정
    const currentBalance = totalGranted - totalUsed + totalAdjusted

    console.log(`[V2] 잔액 계산 결과:`)
    console.log(`- 총 부여: ${totalGranted}일`)
    console.log(`- 총 사용: ${totalUsed}일`)
    console.log(`- 총 소멸: ${totalExpired}일`)
    console.log(`- 조정: ${totalAdjusted}일`)
    console.log(`- 현재 잔액: ${currentBalance}일`)

    return {
      totalGranted,
      totalUsed,
      totalExpired,
      currentBalance,
    }
  }

  // 잔액 업데이트
  async updateMemberBalance(memberId: string): Promise<void> {
    const { totalGranted, totalUsed, totalExpired, currentBalance } = 
      await this.calculateBalance(memberId)

    // 구성원 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("name, team_name, join_date")
      .eq("id", memberId)
      .single()

    if (!member) {
      console.error(`구성원 정보를 찾을 수 없음: ${memberId}`)
      return
    }

    // 기존 잔액 레코드 확인
    const { data: existingBalance } = await supabase
      .from("annual_leave_balances")
      .select("id")
      .eq("member_id", memberId)
      .single()

    const balanceData = {
      member_id: memberId,
      member_name: member.name,
      team_name: member.team_name || "",
      join_date: member.join_date,
      total_granted: totalGranted,
      total_used: totalUsed,
      total_expired: totalExpired,
      current_balance: currentBalance,
      last_updated: new Date().toISOString(),
    }

    let error
    if (existingBalance) {
      // 기존 레코드 업데이트
      const result = await supabase
        .from("annual_leave_balances")
        .update(balanceData)
        .eq("id", existingBalance.id)
      error = result.error
    } else {
      // 새 레코드 생성
      const result = await supabase
        .from("annual_leave_balances")
        .insert(balanceData)
      error = result.error
    }

    if (error) {
      console.error("잔액 업데이트 오류:", error)
      throw error
    }

    console.log(`[V2] ${member.name} 잔액 업데이트 완료`)
  }

  // 사용 가능한 부여 목록 조회 (취소되지 않고 소멸되지 않은 활성 부여)
  async getAvailableGrants(memberId: string): Promise<AnnualLeaveTransaction[]> {
    const transactions = await this.getActiveTransactionsByMemberId(memberId)
    
    // 활성 부여만 필터링 (소멸되지 않은 것)
    const grants = transactions.filter(t => 
      (t.transaction_type === "grant" || t.transaction_type === "manual_grant") &&
      t.expire_date &&
      !t.is_expired  // 소멸되지 않은 것만
    )

    // 각 부여의 사용량 계산
    const grantsWithUsage = grants.map(grant => {
      // 해당 부여를 참조하는 활성 사용 내역
      const usages = transactions.filter(t => 
        t.transaction_type === "use" &&
        t.reference_id === grant.id
      )
      
      const usedAmount = usages.reduce((sum, u) => sum + Math.abs(u.amount), 0)
      const availableAmount = grant.amount - usedAmount
      
      return {
        ...grant,
        availableAmount,
        usedAmount,
      }
    })

    // 사용 가능한 부여만 반환
    return grantsWithUsage.filter(g => g.availableAmount > 0)
  }

  // 부여 트랜잭션 소멸 처리 (expired 필드 업데이트)
  async expireGrantTransaction(
    grantId: string,
    expiredBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from("annual_leave_transactions")
      .update({
        is_expired: true,
        expired_at: new Date().toISOString(),
        expired_by: expiredBy,
      })
      .eq("id", grantId)
      .in("transaction_type", ["grant", "manual_grant"])

    if (error) {
      console.error("부여 소멸 처리 오류:", error)
      throw error
    }
  }

  // 소멸 대상 부여 조회 (아직 소멸되지 않은 활성 부여)
  async getExpirableGrants(memberId: string, targetDate: Date): Promise<AnnualLeaveTransaction[]> {
    const targetDateStr = targetDate.toISOString().split("T")[0]
    console.log(`[V2] 소멸 대상 조회: memberId=${memberId}, targetDate=${targetDateStr}`)
    
    const { data, error } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .in("transaction_type", ["grant", "manual_grant"])
      .lte("expire_date", targetDateStr)
      
    if (error) {
      console.error("소멸 대상 부여 조회 오류:", error)
      throw error
    }
    
    // 클라이언트 사이드에서 필터링
    // - status가 cancelled가 아님
    // - is_expired가 true가 아님 (false 또는 null)
    const activeGrants = (data || []).filter(t => 
      t.status !== "cancelled" && 
      t.is_expired !== true  // null과 false를 모두 포함
    )
    
    console.log(`[V2] 소멸 대상 부여: ${activeGrants.length}개`)
    activeGrants.forEach(g => {
      console.log(`  - ID: ${g.id}, amount: ${g.amount}, expire_date: ${g.expire_date}, is_expired: ${g.is_expired}, status: ${g.status}`)
    })

    return activeGrants as AnnualLeaveTransaction[]
  }
}

export const supabaseAnnualLeaveStorageV2 = new SupabaseAnnualLeaveStorageV2()
import { supabase } from "@/lib/supabase"
import { supabaseAnnualLeaveStorageV2 } from "./supabase-annual-leave-storage-v2"
import type { AnnualLeaveTransaction } from "@/types/annual-leave"

export class AnnualLeaveFIFOV2 {
  // 연차 사용 시 FIFO 방식으로 할당
  async createUsageTransactions(
    memberId: string,
    memberName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    totalDays: number,
    requestId: string,
    createdBy: string
  ): Promise<void> {
    // 1. 사용 가능한 부여 내역 조회 (만료일 순으로 정렬)
    const availableGrants = await supabaseAnnualLeaveStorageV2.getAvailableGrants(memberId)
    
    // 만료일 순으로 정렬 (FIFO)
    availableGrants.sort((a, b) => {
      const dateA = new Date(a.expire_date || '9999-12-31')
      const dateB = new Date(b.expire_date || '9999-12-31')
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime()
      }
      // 만료일이 같으면 부여일 순
      const grantA = new Date(a.grant_date || a.created_at)
      const grantB = new Date(b.grant_date || b.created_at)
      return grantA.getTime() - grantB.getTime()
    })

    // 2. FIFO 방식으로 할당
    let remainingDays = totalDays
    const allocations: { grantId: string; amount: number }[] = []
    
    for (const grant of availableGrants) {
      if (remainingDays <= 0) break
      
      const available = (grant as any).availableAmount || 0
      const useAmount = Math.min(available, remainingDays)
      
      if (useAmount > 0) {
        allocations.push({
          grantId: grant.id,
          amount: useAmount,
        })
        remainingDays -= useAmount
      }
    }

    if (remainingDays > 0) {
      throw new Error(`연차가 부족합니다. 부족한 일수: ${remainingDays}일`)
    }

    // 3. 각 할당에 대해 사용 트랜잭션 생성
    for (const allocation of allocations) {
      const grant = availableGrants.find(g => g.id === allocation.grantId)
      if (!grant) continue

      await supabaseAnnualLeaveStorageV2.createTransaction({
        member_id: memberId,
        member_name: memberName,
        transaction_type: "use",
        amount: -allocation.amount, // 음수로 저장
        reason: `${leaveType} 사용 (${startDate}~${endDate})`,
        grant_date: null, // use 트랜잭션은 부여일 불필요
        expire_date: null, // use 트랜잭션은 만료일 불필요
        reference_id: grant.id, // 부여 ID 참조
        created_by: createdBy,
      })
    }

    console.log(`[V2] FIFO 연차 사용 처리 완료: ${allocations.length}개 부여에서 차감`)
  }

  // 연차 사용 취소 (해당 사용 트랜잭션들을 cancelled로 변경)
  async cancelUsageTransactions(requestId: string, cancelledBy: string): Promise<void> {
    console.log(`[V2] 연차 사용 취소 처리 시작: requestId=${requestId}`)
    
    // 1. 해당 신청과 관련된 모든 부여 ID 찾기
    const { data: allGrants } = await supabase
      .from("annual_leave_transactions")
      .select("id")
      .in("transaction_type", ["grant", "manual_grant"])
      .or('status.eq.active,status.is.null')
    
    const grantIds = (allGrants || []).map(g => g.id)
    
    // 2. 해당 부여들을 참조하는 사용 내역 찾기
    const { data: request } = await supabase
      .from("leave_requests")
      .select("start_date, end_date, member_id")
      .eq("id", requestId)
      .single()
    
    if (!request) {
      console.log("취소할 신청을 찾을 수 없습니다")
      return
    }
    
    // 3. 관련 사용 트랜잭션 찾기
    const { data: usageTransactions } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", request.member_id)
      .eq("transaction_type", "use")
      .in("reference_id", grantIds)
      .or('status.eq.active,status.is.null')
    
    // reason에 날짜가 포함된 것만 필터링
    const relevantUsages = (usageTransactions || []).filter(u => 
      u.reason.includes(request.start_date) && 
      u.reason.includes(request.end_date)
    )
    
    // 4. 각 사용 트랜잭션을 취소 상태로 변경
    for (const usage of relevantUsages) {
      await supabaseAnnualLeaveStorageV2.cancelUsageTransaction(usage.id, cancelledBy)
    }
    
    console.log(`[V2] 연차 사용 취소 완료: ${relevantUsages.length}개 트랜잭션 취소`)
  }
}

export const annualLeaveFIFOV2 = new AnnualLeaveFIFOV2()
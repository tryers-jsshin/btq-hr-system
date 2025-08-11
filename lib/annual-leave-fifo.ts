import { supabase } from "@/lib/supabase"
import type { AnnualLeaveTransaction } from "@/types/annual-leave"

export interface GrantBalance {
  grant_id: string
  grant_date: string
  expire_date: string
  original_amount: number
  used_amount: number
  available_amount: number
  transaction_type: "grant" | "manual_grant"
  reason: string
}

export interface LeaveUsageAllocation {
  grant_id: string
  amount: number
  grant_date: string
  expire_date: string
}

export class AnnualLeaveFIFO {
  // 구성원의 사용 가능한 연차 부여 내역을 FIFO 순서로 조회
  async getAvailableGrants(memberId: string): Promise<GrantBalance[]> {
    // 1. 모든 부여 내역 조회
    const { data: grants, error: grantError } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .eq("member_id", memberId)
      .in("transaction_type", ["grant", "manual_grant"])
      .not("expire_date", "is", null)
      .gt("amount", 0)
      .order("expire_date", { ascending: true }) // 소멸 예정일 순
      .order("grant_date", { ascending: true })  // 그 다음 부여일 순
      .order("created_at", { ascending: true })  // 마지막으로 생성일 순

    if (grantError) {
      console.error("부여 내역 조회 오류:", grantError)
      throw grantError
    }

    const grantList = (grants || []) as AnnualLeaveTransaction[]

    // 2. 각 부여별 사용/취소 내역 계산
    const balances: GrantBalance[] = []
    
    for (const grant of grantList) {
      // 해당 부여를 참조하는 사용/취소 내역 조회
      const { data: usages, error: usageError } = await supabase
        .from("annual_leave_transactions")
        .select("amount")
        .eq("member_id", memberId)
        .eq("reference_id", grant.id)
        .in("transaction_type", ["use", "grant_cancel"])

      if (usageError) {
        console.error("사용 내역 조회 오류:", usageError)
        continue
      }

      // 사용량 계산 (음수를 양수로 변환)
      const usedAmount = (usages || []).reduce((sum, u) => sum + Math.abs(u.amount), 0)
      
      // 오늘 날짜 확인 (만료된 것 제외)
      const today = new Date().toISOString().split("T")[0]
      if (grant.expire_date && grant.expire_date < today) {
        continue // 이미 만료된 부여는 제외
      }

      // 취소된 부여 확인
      const { data: cancellation } = await supabase
        .from("annual_leave_transactions")
        .select("id")
        .eq("reference_id", grant.id)
        .eq("transaction_type", "grant_cancel")
        .single()

      if (cancellation) {
        continue // 취소된 부여는 제외
      }

      const availableAmount = grant.amount - usedAmount
      
      if (availableAmount > 0) {
        balances.push({
          grant_id: grant.id,
          grant_date: grant.grant_date || "",
          expire_date: grant.expire_date || "",
          original_amount: grant.amount,
          used_amount: usedAmount,
          available_amount: availableAmount,
          transaction_type: grant.transaction_type as "grant" | "manual_grant",
          reason: grant.reason
        })
      }
    }

    return balances
  }

  // 연차 사용을 FIFO 방식으로 할당
  allocateLeaveUsage(grants: GrantBalance[], requestedDays: number): LeaveUsageAllocation[] {
    const allocations: LeaveUsageAllocation[] = []
    let remainingDays = requestedDays

    // FIFO 순서대로 차감 (이미 정렬되어 있음)
    for (const grant of grants) {
      if (remainingDays <= 0) break

      const useAmount = Math.min(grant.available_amount, remainingDays)
      
      if (useAmount > 0) {
        allocations.push({
          grant_id: grant.grant_id,
          amount: useAmount,
          grant_date: grant.grant_date,
          expire_date: grant.expire_date
        })
        
        remainingDays -= useAmount
      }
    }

    if (remainingDays > 0) {
      throw new Error(`연차가 부족합니다. 부족한 일수: ${remainingDays}일`)
    }

    return allocations
  }

  // 연차 사용 트랜잭션 생성 (FIFO 적용)
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
    // 1. 사용 가능한 부여 내역 조회
    const grants = await this.getAvailableGrants(memberId)
    
    // 2. FIFO 방식으로 할당
    const allocations = this.allocateLeaveUsage(grants, totalDays)
    
    // 3. 각 할당에 대해 사용 트랜잭션 생성
    for (const allocation of allocations) {
      const { error } = await supabase
        .from("annual_leave_transactions")
        .insert({
          member_id: memberId,
          member_name: memberName,
          transaction_type: "use",
          amount: -allocation.amount, // 음수로 저장
          reason: `${leaveType} 사용 (${startDate}~${endDate})`,
          grant_date: allocation.grant_date,
          expire_date: allocation.expire_date,
          reference_id: allocation.grant_id, // 원본 부여 ID를 reference_id에 저장
          created_by: createdBy
        })
      
      if (error) {
        console.error("사용 트랜잭션 생성 오류:", error)
        throw error
      }
    }

    console.log(`FIFO 연차 사용 처리 완료: ${allocations.length}개 부여에서 차감`)
    allocations.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.grant_date} 부여분에서 ${a.amount}일 차감 (만료: ${a.expire_date})`)
    })
  }

  // 연차 사용 취소 시 원래 부여로 복구
  async cancelUsageTransactions(requestId: string, cancelledBy: string): Promise<void> {
    console.log(`연차 취소 처리 시작: requestId=${requestId}`)
    
    // FIFO 방식으로 생성된 사용 내역 찾기
    // reference_id가 부여 ID인 경우를 먼저 확인
    const { data: allGrants, error: grantError } = await supabase
      .from("annual_leave_transactions")
      .select("id")
      .in("transaction_type", ["grant", "manual_grant"])
      
    if (grantError) {
      console.error("부여 내역 조회 오류:", grantError)
      throw grantError
    }

    const grantIds = (allGrants || []).map(g => g.id)
    
    // reference_id가 부여 ID인 사용 내역 조회 (FIFO 방식)
    const { data: fifoUsages, error: fifoError } = await supabase
      .from("annual_leave_transactions")
      .select("*")
      .in("reference_id", grantIds)
      .eq("transaction_type", "use")
      .lt("amount", 0)
    
    if (fifoError) {
      console.error("FIFO 사용 내역 조회 오류:", fifoError)
    }
    
    // 해당 신청과 관련된 사용 내역 필터링
    // 사용 내역의 reason에 신청 날짜 정보가 포함되어 있어야 함
    const usageTransactions: any[] = []
    
    if (fifoUsages && fifoUsages.length > 0) {
      // 신청 정보 조회
      const { data: request } = await supabase
        .from("leave_requests")
        .select("start_date, end_date, leave_type, member_id")
        .eq("id", requestId)
        .single()
      
      if (request) {
        // reason에 해당 기간이 포함된 사용 내역 찾기
        const relevantUsages = fifoUsages.filter(u => {
          return u.member_id === request.member_id &&
                 u.reason.includes(request.start_date) &&
                 u.reason.includes(request.end_date)
        })
        
        if (relevantUsages.length > 0) {
          usageTransactions.push(...relevantUsages)
        }
      }
    }

    // FIFO 방식 사용 내역이 없으면 구형 방식 확인
    if (usageTransactions.length === 0) {
      const { data: oldUsages } = await supabase
        .from("annual_leave_transactions")
        .select("*")
        .eq("reference_id", requestId)
        .eq("transaction_type", "use")
        .lt("amount", 0)
      
      if (oldUsages && oldUsages.length > 0) {
        console.log(`구형 방식 사용 내역 발견: ${oldUsages.length}개`)
        // 구형 방식: reference_id가 신청 ID인 경우
        for (const usage of oldUsages) {
          const { error: insertError } = await supabase
            .from("annual_leave_transactions")
            .insert({
              member_id: usage.member_id,
              member_name: usage.member_name,
              transaction_type: "use_cancel",
              amount: Math.abs(usage.amount), // 양수로 저장
              reason: usage.reason.replace("사용", "사용 취소"),
              grant_date: usage.grant_date,
              expire_date: usage.expire_date,
              reference_id: requestId,
              created_by: cancelledBy
            })
          
          if (insertError) {
            console.error("복구 트랜잭션 생성 오류:", insertError)
          }
        }
        console.log(`연차 취소 처리 완료 (구형): ${oldUsages.length}개 복구`)
        return
      }
      
      console.log("취소할 사용 내역이 없습니다")
      return
    }

    // 각 사용 트랜잭션에 대해 복구 트랜잭션 생성
    console.log(`FIFO 방식 사용 내역 발견: ${usageTransactions.length}개`)
    for (const usage of usageTransactions) {
      const { error: insertError } = await supabase
        .from("annual_leave_transactions")
        .insert({
          member_id: usage.member_id,
          member_name: usage.member_name,
          transaction_type: "use_cancel",
          amount: Math.abs(usage.amount), // 양수로 저장
          reason: usage.reason.replace("사용", "사용 취소"),
          grant_date: usage.grant_date,
          expire_date: usage.expire_date,
          reference_id: usage.reference_id, // 원본 부여 ID 유지
          created_by: cancelledBy
        })
      
      if (insertError) {
        console.error("복구 트랜잭션 생성 오류:", insertError)
      }
    }

    console.log(`FIFO 연차 취소 처리 완료: ${usageTransactions.length}개 부여로 복구`)
  }
}

export const annualLeaveFIFO = new AnnualLeaveFIFO()
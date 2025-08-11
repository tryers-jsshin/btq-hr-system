import { supabaseAnnualLeaveStorage } from "./supabase-annual-leave-storage"
import { supabaseAnnualLeaveStorageV2 } from "./supabase-annual-leave-storage-v2"
import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import type { AnnualLeaveCalculation, AnnualLeavePolicy, AnnualLeaveTransaction } from "@/types/annual-leave"

type Member = Database["public"]["Tables"]["members"]["Row"]

interface MonthlyGrantInfo {
  amount: number
  reason: string
  grantDate: Date
}

export class AnnualLeavePolicyEngine {
  private policy: AnnualLeavePolicy | null = null

  async initialize() {
    this.policy = await supabaseAnnualLeaveStorage.getActivePolicy()
    if (!this.policy) {
      throw new Error("활성화된 연차 정책이 없습니다.")
    }
  }

  // 특정 날짜의 연차 계산 (기본값: 오늘)
  async calculateAnnualLeaveForDate(targetDate: Date = new Date()): Promise<AnnualLeaveCalculation[]> {
    if (!this.policy) await this.initialize()
    if (!this.policy) throw new Error("연차 정책을 불러올 수 없습니다.")

    // V2로 변경 필요 시 여기서 처리, 현재는 V1 유지 (구성원 목록 조회용)
    const members = await supabaseAnnualLeaveStorage.getActiveMembersForLeaveCalculation()
    const calculations: AnnualLeaveCalculation[] = []

    for (const member of members) {
      const calculation = await this.calculateMemberAnnualLeave(member, targetDate)
      calculations.push(calculation)
    }

    return calculations
  }

  // 개별 구성원의 연차 계산
  private async calculateMemberAnnualLeave(member: Member, targetDate: Date): Promise<AnnualLeaveCalculation> {
    console.log(`=== ${member.name} 연차 계산 시작 ===`)
    console.log(`입사일: ${member.join_date}`)
    console.log(`기준일: ${targetDate.toISOString().split("T")[0]}`)

    const joinDate = new Date(member.join_date)
    const yearsOfService = this.calculateYearsOfService(joinDate, targetDate)

    // 입사 1년이 되는 날까지는 첫 해 (월별 부여)
    // 입사 1년이 지나면 연간 부여 단계
    const oneYearLater = new Date(joinDate)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    const currentPhase = targetDate < oneYearLater ? "first_year" : "annual_grant"

    console.log(`근속년수: ${yearsOfService.toFixed(2)}년`)
    console.log(`입사 1년 기준일: ${oneYearLater.toISOString().split("T")[0]}`)
    console.log(`현재 단계: ${currentPhase}`)

    let shouldGrantToday = 0
    let shouldExpireToday = 0
    let nextGrantDate: string | undefined
    let nextExpireDate: string | undefined

    // 기존 거래 내역 조회 (V2 사용 - 활성 트랜잭션만)
    const transactions = await supabaseAnnualLeaveStorageV2.getActiveTransactionsByMemberId(member.id)
    console.log(`기존 거래 내역: ${transactions.length}건`)
    
    // 디버깅: manual_grant 확인
    const manualGrants = transactions.filter(t => t.transaction_type === "manual_grant")
    console.log(`  - manual_grant: ${manualGrants.length}건`)
    manualGrants.forEach(g => {
      console.log(`    * expire_date: ${g.expire_date}, is_expired: ${g.is_expired}, status: ${g.status}`)
    })

    if (currentPhase === "first_year") {
      console.log("→ 첫 해 월별 부여 계산 중...")
      // 1단계: 월별 부여 계산 (누락된 연차 포함)
      const monthlyGrantResult = this.calculateMonthlyGrantWithBackfill(joinDate, targetDate, transactions)
      shouldGrantToday = monthlyGrantResult.shouldGrantToday
      nextGrantDate = monthlyGrantResult.nextGrantDate

      console.log(`오늘 부여할 연차: ${shouldGrantToday}일`)
      console.log(`다음 부여일: ${nextGrantDate || "없음"}`)
    } else {
      console.log("→ 연간 부여 계산 중...")
      // 2단계: 연간 부여 계산
      const annualGrantResult = this.calculateAnnualGrantWithBackfill(
        joinDate,
        targetDate,
        yearsOfService,
        transactions,
      )
      shouldGrantToday = annualGrantResult.shouldGrantToday
      nextGrantDate = annualGrantResult.nextGrantDate

      console.log(`오늘 부여할 연차: ${shouldGrantToday}일`)
      console.log(`다음 부여일: ${nextGrantDate || "없음"}`)
    }

    // 소멸 계산 (모든 단계에서 실행 - manual_grant도 소멸되어야 함)
    const expirationResult = this.calculateExpiration(targetDate, transactions)
    shouldExpireToday = expirationResult.shouldExpireToday
    nextExpireDate = expirationResult.nextExpireDate

    console.log(`오늘 소멸할 연차: ${shouldExpireToday}일`)
    console.log(`다음 소멸일: ${nextExpireDate || "없음"}`)

    // 입사 1주년 당일(자정)에 첫 해 연차 소멸 처리 (단계와 무관하게)
    if (this.isSameDate(targetDate, oneYearLater)) {
      const expiredAmount = this.calculateFirstYearExpiration(transactions)
      if (expiredAmount > 0) {
        shouldExpireToday += expiredAmount
        console.log(`★ 입사 1주년 당일(자정) - 첫 해 연차 소멸: ${expiredAmount}일`)
      }
    }

    console.log(`=== ${member.name} 연차 계산 완료 ===`)
    console.log()

    return {
      member_id: member.id,
      member_name: member.name,
      join_date: member.join_date,
      years_of_service: yearsOfService,
      current_phase: currentPhase,
      should_grant_today: shouldGrantToday,
      should_expire_today: shouldExpireToday,
      next_grant_date: nextGrantDate,
      next_expire_date: nextExpireDate,
      monthly_grants_received: this.countMonthlyGrants(transactions),
      annual_grants_received: this.countAnnualGrants(transactions),
    }
  }

  // 연간 부여 계산 (누락된 연차 소급 부여 포함)
  private calculateAnnualGrantWithBackfill(
    joinDate: Date,
    targetDate: Date,
    yearsOfService: number,
    transactions: AnnualLeaveTransaction[],
  ): { shouldGrantToday: number; nextGrantDate?: string } {
    if (!this.policy) return { shouldGrantToday: 0 }

    console.log(
      `  연간 부여 계산 (소급 포함): 입사일 ${joinDate.toISOString().split("T")[0]}, 기준일 ${targetDate.toISOString().split("T")[0]}`,
    )

    // 현재 연차 구간 파악 (가장 최근 기념일 기준)
    const currentAnniversaryYear = this.getCurrentAnniversaryYear(joinDate, targetDate)
    const currentServiceYears = currentAnniversaryYear - joinDate.getFullYear()

    console.log(`  현재 연차 구간: ${currentServiceYears}년차 (${currentAnniversaryYear}년 기준)`)

    // 현재 구간의 연차가 이미 부여되었는지 확인
    const hasCurrentYearGrant = transactions.some(
      (t) =>
        t.transaction_type === "grant" &&
        t.grant_date &&
        new Date(t.grant_date).getFullYear() === currentAnniversaryYear &&
        t.reason.includes("연간 부여"),
    )

    console.log(`  현재 구간 연차 부여 여부: ${hasCurrentYearGrant ? "이미 부여됨" : "미부여"}`)

    if (hasCurrentYearGrant) {
      // 이미 부여된 경우, 다음 기념일 계산
      const nextAnniversary = new Date(joinDate)
      nextAnniversary.setFullYear(currentAnniversaryYear + 1)

      return {
        shouldGrantToday: 0,
        nextGrantDate: nextAnniversary.toISOString().split("T")[0],
      }
    }

    // 현재 구간의 연차 일수 계산 (현재 구간에 해당하는 연차만)
    const annualDays = this.calculateAnnualDays(currentServiceYears)

    console.log(`  현재 구간 근속년수: ${currentServiceYears}년차`)
    console.log(`  ★ 오늘 소급 부여할 연차: ${annualDays}일 (${currentServiceYears}년차 연차만)`)

    // 다음 기념일 계산
    const nextAnniversary = new Date(joinDate)
    nextAnniversary.setFullYear(currentAnniversaryYear + 1)

    return {
      shouldGrantToday: annualDays,
      nextGrantDate: nextAnniversary.toISOString().split("T")[0],
    }
  }

  // 현재까지 받았어야 할 연간 부여 횟수 계산
  private calculateShouldHaveReceivedAnnualGrants(joinDate: Date, targetDate: Date): number {
    let count = 0
    const currentYear = targetDate.getFullYear()

    // 입사 1년 후부터 매년 기념일 확인
    for (let year = joinDate.getFullYear() + 1; year <= currentYear; year++) {
      const anniversaryDate = new Date(joinDate)
      anniversaryDate.setFullYear(year)

      if (anniversaryDate <= targetDate) {
        count++
      }
    }

    console.log(`  연간 부여 횟수 계산: ${joinDate.getFullYear() + 1}년부터 ${currentYear}년까지 = ${count}회`)
    return count
  }

  // 현재 유효한 연간 부여 계산 (소멸된 연차 제외) - 사용하지 않음
  private calculateCurrentValidAnnualGrant(
    joinDate: Date,
    targetDate: Date,
    yearsOfService: number,
    transactions: AnnualLeaveTransaction[],
  ): { shouldGrantToday: number; nextGrantDate?: string } {
    if (!this.policy) return { shouldGrantToday: 0 }

    console.log(
      `  현재 유효한 연간 부여 계산: 입사일 ${joinDate.toISOString().split("T")[0]}, 기준일 ${targetDate.toISOString().split("T")[0]}`,
    )

    // 현재 연차 구간 파악 (가장 최근 기념일 기준)
    const currentAnniversaryYear = this.getCurrentAnniversaryYear(joinDate, targetDate)
    const currentAnniversaryDate = new Date(joinDate)
    currentAnniversaryDate.setFullYear(currentAnniversaryYear)

    console.log(
      `  현재 연차 구간: ${currentAnniversaryYear}년 (${currentAnniversaryDate.toISOString().split("T")[0]} 기준)`,
    )

    // 현재 구간의 연차가 이미 부여되었는지 확인
    const hasCurrentYearGrant = transactions.some(
      (t) =>
        t.transaction_type === "grant" &&
        t.grant_date &&
        new Date(t.grant_date).getFullYear() === currentAnniversaryYear &&
        t.reason.includes("연간 부여"),
    )

    console.log(`  현재 구간 연차 부여 여부: ${hasCurrentYearGrant ? "이미 부여됨" : "미부여"}`)

    if (hasCurrentYearGrant) {
      // 이미 부여된 경우, 다음 기념일 계산
      const nextAnniversary = new Date(joinDate)
      nextAnniversary.setFullYear(currentAnniversaryYear + 1)

      return {
        shouldGrantToday: 0,
        nextGrantDate: nextAnniversary.toISOString().split("T")[0],
      }
    }

    // 현재 구간의 연차 일수 계산
    const serviceYearsForCurrentGrant = currentAnniversaryYear - joinDate.getFullYear()
    const annualDays = this.calculateAnnualDays(serviceYearsForCurrentGrant)

    console.log(`  현재 구간 근속년수: ${serviceYearsForCurrentGrant}년`)
    console.log(`  부여할 연차 일수: ${annualDays}일`)

    // 다음 기념일 계산
    const nextAnniversary = new Date(joinDate)
    nextAnniversary.setFullYear(currentAnniversaryYear + 1)

    return {
      shouldGrantToday: annualDays,
      nextGrantDate: nextAnniversary.toISOString().split("T")[0],
    }
  }

  // 현재 연차 구간의 기념일 연도 계산
  private getCurrentAnniversaryYear(joinDate: Date, targetDate: Date): number {
    const joinYear = joinDate.getFullYear()
    const targetYear = targetDate.getFullYear()

    // 입사 1년 후부터 시작
    for (let year = joinYear + 1; year <= targetYear; year++) {
      const anniversaryDate = new Date(joinDate)
      anniversaryDate.setFullYear(year)

      // 해당 연도의 기념일이 아직 지나지 않았다면, 이전 연도가 현재 구간
      if (anniversaryDate > targetDate) {
        return year - 1
      }
    }

    // 모든 기념일이 지났다면 현재 연도가 현재 구간
    return targetYear
  }

  // 월별 부여 계산 (누락된 연차 소급 부여 포함)
  private calculateMonthlyGrantWithBackfill(
    joinDate: Date,
    targetDate: Date,
    transactions: AnnualLeaveTransaction[],
  ): { shouldGrantToday: number; nextGrantDate?: string } {
    if (!this.policy) return { shouldGrantToday: 0 }

    console.log(
      `  월별 부여 계산 (소급 포함): 입사일 ${joinDate.toISOString().split("T")[0]}, 기준일 ${targetDate.toISOString().split("T")[0]}`,
    )

    const monthlyGrantsReceived = this.countMonthlyGrants(transactions)
    console.log(`  이미 받은 월별 부여: ${monthlyGrantsReceived}회`)

    // 최대 부여 가능 횟수 확인
    if (monthlyGrantsReceived >= this.policy.first_year_max_days) {
      console.log(`  최대 부여 횟수 도달 (${this.policy.first_year_max_days}회)`)
      return { shouldGrantToday: 0 }
    }

    // 현재까지 받았어야 할 월별 부여 횟수 계산
    const shouldHaveReceived = this.calculateShouldHaveReceivedMonthlyGrants(joinDate, targetDate)
    console.log(`  현재까지 받았어야 할 부여 횟수: ${shouldHaveReceived}회`)

    // 누락된 부여 횟수 계산
    const missedGrants = Math.max(0, shouldHaveReceived - monthlyGrantsReceived)
    console.log(`  누락된 부여 횟수: ${missedGrants}회`)

    if (missedGrants > 0) {
      // 최대 부여 가능 횟수를 초과하지 않도록 조정
      const actualGrantsToday = Math.min(missedGrants, this.policy.first_year_max_days - monthlyGrantsReceived)
      const totalGrantsAfterToday = monthlyGrantsReceived + actualGrantsToday

      console.log(
        `  ★ 오늘 소급 부여할 연차: ${actualGrantsToday * this.policy.first_year_monthly_grant}일 (${actualGrantsToday}회 × ${this.policy.first_year_monthly_grant}일)`,
      )

      // 다음 부여일 계산
      let nextGrantDate: string | undefined
      if (totalGrantsAfterToday < this.policy.first_year_max_days) {
        const nextGrantDateObj = this.calculateNextMonthlyGrantDate(joinDate, totalGrantsAfterToday + 1)
        nextGrantDate = nextGrantDateObj.toISOString().split("T")[0]
      }

      return {
        shouldGrantToday: actualGrantsToday * this.policy.first_year_monthly_grant,
        nextGrantDate,
      }
    }

    // 누락된 부여가 없는 경우, 기존 로직 사용
    return this.calculateMonthlyGrant(joinDate, targetDate, transactions)
  }

  // 누락된 월별 부여 정보 계산 (개별 부여용) - public으로 변경
  public calculateMissedMonthlyGrants(
    joinDate: Date,
    targetDate: Date,
    transactions: AnnualLeaveTransaction[],
  ): MonthlyGrantInfo[] {
    if (!this.policy) return []

    const monthlyGrantsReceived = this.countMonthlyGrants(transactions)
    const shouldHaveReceived = this.calculateShouldHaveReceivedMonthlyGrants(joinDate, targetDate)
    const missedGrants = Math.max(0, shouldHaveReceived - monthlyGrantsReceived)

    if (missedGrants === 0) return []

    const missedGrantInfos: MonthlyGrantInfo[] = []
    const actualGrantsToday = Math.min(missedGrants, this.policy.first_year_max_days - monthlyGrantsReceived)

    // 각 누락된 개월차별로 개별 부여 정보 생성
    for (let i = 0; i < actualGrantsToday; i++) {
      const grantNumber = monthlyGrantsReceived + i + 1
      const grantDate = this.calculateNextMonthlyGrantDate(joinDate, grantNumber)

      missedGrantInfos.push({
        amount: this.policy.first_year_monthly_grant,
        reason: `월별 부여 (입사 ${grantNumber}개월차)`,
        grantDate: grantDate,
      })
    }

    return missedGrantInfos
  }

  // 현재까지 받았어야 할 월별 부여 횟수 계산
  private calculateShouldHaveReceivedMonthlyGrants(joinDate: Date, targetDate: Date): number {
    if (!this.policy) return 0

    let count = 0
    const maxGrants = this.policy.first_year_max_days

    for (let i = 1; i <= maxGrants; i++) {
      const grantDate = this.calculateNextMonthlyGrantDate(joinDate, i)
      if (grantDate <= targetDate) {
        count++
      } else {
        break
      }
    }

    return count
  }

  // 월별 부여 계산 (기존 로직)
  private calculateMonthlyGrant(
    joinDate: Date,
    targetDate: Date,
    transactions: AnnualLeaveTransaction[],
  ): { shouldGrantToday: number; nextGrantDate?: string } {
    if (!this.policy) return { shouldGrantToday: 0 }

    console.log(
      `  월별 부여 계산: 입사일 ${joinDate.toISOString().split("T")[0]}, 기준일 ${targetDate.toISOString().split("T")[0]}`,
    )

    const monthlyGrantsReceived = this.countMonthlyGrants(transactions)
    console.log(`  이미 받은 월별 부여: ${monthlyGrantsReceived}회`)

    // 최대 부여 가능 횟수 확인
    if (monthlyGrantsReceived >= this.policy.first_year_max_days) {
      console.log(`  최대 부여 횟수 도달 (${this.policy.first_year_max_days}회)`)
      return { shouldGrantToday: 0 }
    }

    // 다음 부여일 계산
    const nextGrantDate = this.calculateNextMonthlyGrantDate(joinDate, monthlyGrantsReceived + 1)
    console.log(`  다음 부여일 계산: ${nextGrantDate.toISOString().split("T")[0]}`)

    if (this.isSameDate(targetDate, nextGrantDate)) {
      console.log(`  ★ 오늘이 부여일입니다!`)
      return {
        shouldGrantToday: this.policy.first_year_monthly_grant,
        nextGrantDate: this.calculateNextMonthlyGrantDate(joinDate, monthlyGrantsReceived + 2)
          ?.toISOString()
          .split("T")[0],
      }
    }

    console.log(`  오늘은 부여일이 아닙니다`)
    return {
      shouldGrantToday: 0,
      nextGrantDate: nextGrantDate.toISOString().split("T")[0],
    }
  }

  // 연간 부여 계산 (기존 로직)
  private calculateAnnualGrant(
    joinDate: Date,
    targetDate: Date,
    yearsOfService: number,
    transactions: AnnualLeaveTransaction[],
  ): { shouldGrantToday: number; nextGrantDate?: string } {
    if (!this.policy) return { shouldGrantToday: 0 }

    // 입사 기념일인지 확인
    const anniversaryDate = new Date(joinDate)
    anniversaryDate.setFullYear(targetDate.getFullYear())

    if (!this.isSameDate(targetDate, anniversaryDate)) {
      // 다음 기념일 계산
      if (targetDate > anniversaryDate) {
        anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1)
      }
      return {
        shouldGrantToday: 0,
        nextGrantDate: anniversaryDate.toISOString().split("T")[0],
      }
    }

    // 해당 연도에 이미 부여했는지 확인
    const currentYear = targetDate.getFullYear()
    const hasGrantedThisYear = transactions.some(
      (t) => t.transaction_type === "grant" && t.grant_date && new Date(t.grant_date).getFullYear() === currentYear,
    )

    if (hasGrantedThisYear) {
      anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1)
      return {
        shouldGrantToday: 0,
        nextGrantDate: anniversaryDate.toISOString().split("T")[0],
      }
    }

    // 부여할 연차 일수 계산
    const annualDays = this.calculateAnnualDays(yearsOfService)
    anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1)

    return {
      shouldGrantToday: annualDays,
      nextGrantDate: anniversaryDate.toISOString().split("T")[0],
    }
  }

  // 소멸 계산 (과거 소멸일 포함)
  private calculateExpiration(
    targetDate: Date,
    transactions: AnnualLeaveTransaction[],
  ): { shouldExpireToday: number; nextExpireDate?: string } {
    let shouldExpireToday = 0
    let nextExpireDate: Date | undefined

    // 오늘까지 소멸 예정인 부여 내역 찾기 (과거 포함) - manual_grant 포함
    console.log(`  소멸 계산 시작 - targetDate: ${targetDate.toISOString().split("T")[0]}`)
    const expiringGrants = transactions.filter(
      (t) => {
        const isGrantType = t.transaction_type === "grant" || t.transaction_type === "manual_grant"
        const hasExpireDate = !!t.expire_date
        const isExpired = hasExpireDate && new Date(t.expire_date) <= targetDate
        
        if (t.transaction_type === "manual_grant") {
          console.log(`    manual_grant 체크: expire_date=${t.expire_date}, isExpired=${isExpired}`)
        }
        
        return isGrantType && hasExpireDate && isExpired
      }
    )

    console.log(`  소멸 대상 부여 내역: ${expiringGrants.length}건`)
    expiringGrants.forEach(g => {
      console.log(`    - ${g.transaction_type}: expire_date=${g.expire_date}, amount=${g.amount}`)
    })

    for (const grant of expiringGrants) {
      // 이미 소멸 처리되었는지 확인
      const hasExpired = transactions.some((t) => t.transaction_type === "expire" && t.grant_date === grant.grant_date)

      if (!hasExpired) {
        // 해당 부여 내역의 미사용 잔액 계산
        const usedAmount = transactions
          .filter(
            (t) =>
              t.grant_date === grant.grant_date && (t.transaction_type === "use" || t.transaction_type === "expire"),
          )
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const remainingAmount = grant.amount - usedAmount
        if (remainingAmount > 0) {
          shouldExpireToday += remainingAmount
          console.log(`  - 소멸 예정: ${remainingAmount}일 (부여일: ${grant.grant_date}, 소멸일: ${grant.expire_date})`)
        }
      }
    }

    // 다음 소멸 예정일 찾기 - manual_grant 포함
    const futureExpireDates = transactions
      .filter((t) => (t.transaction_type === "grant" || t.transaction_type === "manual_grant") && 
                     t.expire_date && 
                     new Date(t.expire_date) > targetDate)
      .map((t) => new Date(t.expire_date!))
      .sort((a, b) => a.getTime() - b.getTime())

    if (futureExpireDates.length > 0) {
      nextExpireDate = futureExpireDates[0]
    }

    return {
      shouldExpireToday,
      nextExpireDate: nextExpireDate?.toISOString().split("T")[0],
    }
  }

  // 첫 해 연차 소멸 계산
  private calculateFirstYearExpiration(transactions: AnnualLeaveTransaction[]): number {
    // 첫 해 월별 부여만 계산 (연간 부여는 제외)
    const totalGranted = transactions
      .filter((t) => t.transaction_type === "grant" && t.reason.includes("월별 부여"))
      .reduce((sum, t) => sum + t.amount, 0)

    const totalUsed = transactions
      .filter((t) => t.transaction_type === "use" || t.transaction_type === "expire")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalAdjusted = transactions
      .filter((t) => t.transaction_type === "adjust")
      .reduce((sum, t) => sum + t.amount, 0)

    const remainingFirstYearLeave = totalGranted - totalUsed + totalAdjusted

    console.log(`  첫 해 연차 소멸 계산:`)
    console.log(`  - 첫 해 부여: ${totalGranted}일`)
    console.log(`  - 총 사용: ${totalUsed}일`)
    console.log(`  - 총 조정: ${totalAdjusted}일`)
    console.log(`  - 소멸 대상: ${remainingFirstYearLeave}일`)

    return Math.max(0, remainingFirstYearLeave)
  }

  // 유틸리티 메서드들
  private calculateYearsOfService(joinDate: Date, targetDate: Date): number {
    const diffTime = targetDate.getTime() - joinDate.getTime()
    return diffTime / (1000 * 60 * 60 * 24 * 365.25)
  }

  private calculateNextMonthlyGrantDate(joinDate: Date, grantNumber: number): Date {
    const nextDate = new Date(joinDate)
    nextDate.setMonth(nextDate.getMonth() + grantNumber)

    // 31일 예외 처리
    if (joinDate.getDate() === 31) {
      const targetMonth = nextDate.getMonth()
      const lastDayOfMonth = new Date(nextDate.getFullYear(), targetMonth + 1, 0).getDate()
      nextDate.setDate(Math.min(31, lastDayOfMonth))
    }

    return nextDate
  }

  // ✅ 수정된 연차 일수 계산 로직
  private calculateAnnualDays(yearsOfService: number): number {
    if (!this.policy) return 0

    console.log(`    연차 일수 계산: ${yearsOfService}년차`)

    // 1년차, 2년차: 15일 (기본 연차)
    if (yearsOfService <= 2) {
      console.log(`    → ${yearsOfService}년차: ${this.policy.base_annual_days}일 (기본 연차)`)
      return this.policy.base_annual_days
    }

    // 3년차부터: 2년마다 1일 추가 (15→16→17→...→최대 25일)
    // 3년차(15+1=16), 5년차(15+2=17), 7년차(15+3=18), ...
    const incrementPeriods = Math.floor((yearsOfService - 1) / this.policy.increment_years)
    const calculatedDays = this.policy.base_annual_days + incrementPeriods * this.policy.increment_days
    const finalDays = Math.min(calculatedDays, this.policy.max_annual_days)

    console.log(
      `    → ${yearsOfService}년차: 기본 ${this.policy.base_annual_days}일 + 추가 ${incrementPeriods}일 = ${finalDays}일`,
    )
    console.log(`    → 계산식: (${yearsOfService}-1) ÷ ${this.policy.increment_years} = ${incrementPeriods}회 증가`)

    return finalDays
  }

  private countMonthlyGrants(transactions: AnnualLeaveTransaction[]): number {
    return transactions.filter((t) => t.transaction_type === "grant" && t.reason.includes("월별 부여")).length
  }

  private countAnnualGrants(transactions: AnnualLeaveTransaction[]): number {
    return transactions.filter((t) => t.transaction_type === "grant" && t.reason.includes("연간 부여")).length
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0]
  }

  // 연차 부여 실행
  async grantAnnualLeave(
    memberId: string,
    memberName: string,
    amount: number,
    reason: string,
    grantDate: Date,
    createdBy: string,
  ): Promise<void> {
    if (!this.policy) await this.initialize()
    if (!this.policy) throw new Error("연차 정책을 불러올 수 없습니다.")

    console.log(`연차 부여 실행: ${memberName}님에게 ${amount}일 부여`)

    // 구성원 정보 조회 (입사일 확인용)
    const member = await supabase.from("members").select("join_date").eq("id", memberId).single()
    if (!member.data) {
      throw new Error("구성원 정보를 찾을 수 없습니다.")
    }

    const joinDate = new Date(member.data.join_date)
    const currentDate = new Date(grantDate)
    const yearsOfService = this.calculateYearsOfService(joinDate, currentDate)

    // 입사 1년이 되는 날까지는 첫 해로 간주
    const oneYearLater = new Date(joinDate)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    const isFirstYear = currentDate < oneYearLater

    console.log(`입사일: ${joinDate.toISOString().split("T")[0]}`)
    console.log(`부여일: ${currentDate.toISOString().split("T")[0]}`)
    console.log(`근속년수: ${yearsOfService.toFixed(2)}년`)
    console.log(`첫 해 여부: ${isFirstYear}`)
    console.log(`부여 사유: ${reason}`)

    // ✅ 수정된 소멸 예정일 계산
    let expireDate: Date

    if (isFirstYear) {
      // 입사일~1년까지: 입사 1주년 당일 자정에 모든 미사용 연차 자동 소멸
      // 예: 2024년 7월 17일 입사 → 2025년 7월 17일 00:00:00에 소멸
      expireDate = new Date(joinDate)
      expireDate.setFullYear(expireDate.getFullYear() + 1) // 입사 1년 후
      console.log(`입사 1년차 연차 소멸일: ${expireDate.toISOString().split("T")[0]} (입사 1주년 당일 자정)`)
    } else {
      // 1년 이후: 다음 입사기념일 자정에 소멸
      // 예: 2025년 7월 17일 부여 → 2026년 7월 17일 00:00:00에 소멸
      expireDate = new Date(grantDate)
      expireDate.setFullYear(expireDate.getFullYear() + 1) // 1년 후

      console.log(`연간 부여 연차 소멸일: ${expireDate.toISOString().split("T")[0]} (다음 입사기념일 자정)`)
      console.log(`계산 과정: ${grantDate.toISOString().split("T")[0]} + 1년`)
    }

    // V2 시스템으로 거래 내역 생성
    await supabaseAnnualLeaveStorageV2.createTransaction({
      member_id: memberId,
      member_name: memberName,
      transaction_type: "grant",
      amount,
      reason,
      grant_date: grantDate.toISOString().split("T")[0],
      expire_date: expireDate.toISOString().split("T")[0],
      created_by: createdBy,
    })

    // 잔액 업데이트
    await this.updateMemberBalance(memberId)
  }

  // 연차 소멸 실행 (더 이상 사용하지 않음 - is_expired 필드로 관리)
  // @deprecated expire 트랜잭션 대신 is_expired 필드 사용
  async expireAnnualLeave(
    memberId: string,
    memberName: string,
    amount: number,
    reason: string,
    grantDate: string,
    createdBy: string,
  ): Promise<void> {
    console.log(`[DEPRECATED] 이 함수는 더 이상 사용되지 않습니다. is_expired 필드를 사용하세요.`)
  }

  // 구성원 잔액 업데이트 (V2 사용)
  private async updateMemberBalance(memberId: string): Promise<void> {
    console.log(`=== ${memberId} 잔액 업데이트 시작 (V2) ===`)
    
    // V2 시스템으로 잔액 업데이트
    await supabaseAnnualLeaveStorageV2.updateMemberBalance(memberId)
    
    console.log(`=== 잔액 업데이트 완료 (V2) ===`)
  }

  // 연차 소멸 처리 (특정 날짜 기준)
  public async processExpiredLeaves(memberId: string, memberName: string, targetDate: Date): Promise<void> {
    console.log(`연차 소멸 처리 시작: ${memberName}님, 기준일: ${targetDate.toISOString().split("T")[0]}`)

    // V2 시스템 사용: 소멸 대상 부여 조회 (아직 소멸되지 않은 것만)
    const expiringGrants = await supabaseAnnualLeaveStorageV2.getExpirableGrants(memberId, targetDate)
    
    console.log(`소멸 대상 부여: ${expiringGrants.length}개`)
    
    // 모든 트랜잭션 조회 (사용량 계산용)
    const transactions = await supabaseAnnualLeaveStorageV2.getActiveTransactionsByMemberId(memberId)

    for (const grant of expiringGrants) {
      const expireDate = new Date(grant.expire_date!)
      console.log(`  처리 중: 부여 ID ${grant.id}, 부여일: ${grant.grant_date}, 소멸예정일: ${grant.expire_date}`)


      // 해당 부여를 참조하는 사용 내역 계산
      const usedAmount = transactions
        .filter(
          (t) => t.reference_id === grant.id && 
                 t.transaction_type === "use" &&
                 t.status !== "cancelled"
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const remainingAmount = grant.amount - usedAmount
      console.log(`  - 부여량: ${grant.amount}, 사용량: ${usedAmount}, 잔여량: ${remainingAmount}`)

      if (remainingAmount > 0) {
        // 소멸 실행
        const reason = "연차 유효기간 만료"
        console.log(
          `  - ${grant.grant_date} 부여 연차 소멸: ${remainingAmount}일 (소멸일: ${expireDate.toISOString().split("T")[0]})`,
        )

        if (usedAmount > 0) {
          // 일부 사용된 경우: 부여 분할 처리
          console.log(`  - 부여 분할 처리: 사용 ${usedAmount}일은 유지, 미사용 ${remainingAmount}일만 소멸`)
          
          // 1. 원본 부여를 cancelled로 변경
          await supabaseAnnualLeaveStorageV2.cancelTransaction(grant.id, "SYSTEM")
          
          // 2. 사용된 만큼만 새로운 부여 생성 (소멸되지 않는 부분)
          await supabaseAnnualLeaveStorageV2.createTransaction({
            member_id: grant.member_id,
            member_name: grant.member_name,
            transaction_type: grant.transaction_type,
            amount: usedAmount,
            reason: `${grant.reason} (사용분 보존)`,
            grant_date: grant.grant_date,
            expire_date: grant.expire_date,
            created_by: "SYSTEM",
          })
          
          // 3. 잔여량에 대한 소멸 처리 (별도 부여로 생성 후 즉시 소멸)
          await supabaseAnnualLeaveStorageV2.createTransaction({
            member_id: grant.member_id,
            member_name: grant.member_name,
            transaction_type: grant.transaction_type,
            amount: remainingAmount,
            reason: `${grant.reason} (소멸분)`,
            grant_date: grant.grant_date,
            expire_date: grant.expire_date,
            created_by: "SYSTEM",
          })
          
          // 4. 소멸분 부여 찾아서 expired 마킹
          const { supabase } = await import("./supabase")
          const { data: expiredGrant } = await supabase
            .from("annual_leave_transactions")
            .select("id")
            .eq("member_id", grant.member_id)
            .eq("amount", remainingAmount)
            .eq("reason", `${grant.reason} (소멸분)`)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
          
          if (expiredGrant) {
            await supabaseAnnualLeaveStorageV2.expireGrantTransaction(expiredGrant.id, "SYSTEM")
          }
          
          // 5. 사용 내역들을 새 부여로 재연결
          const newGrantResult = await supabase
            .from("annual_leave_transactions")
            .select("id")
            .eq("member_id", grant.member_id)
            .eq("amount", usedAmount)
            .eq("reason", `${grant.reason} (사용분 보존)`)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
          
          if (newGrantResult.data) {
            // 기존 사용 내역의 reference_id 업데이트
            const usages = transactions.filter(t => 
              t.reference_id === grant.id && 
              t.transaction_type === "use" &&
              t.status !== "cancelled"
            )
            
            for (const usage of usages) {
              await supabase
                .from("annual_leave_transactions")
                .update({ reference_id: newGrantResult.data.id })
                .eq("id", usage.id)
            }
          }
        } else {
          // 전혀 사용되지 않은 경우: 전체 소멸
          await supabaseAnnualLeaveStorageV2.expireGrantTransaction(grant.id, "SYSTEM")
          console.log(`  - 부여 ID ${grant.id} 전체 소멸 처리`)
        }
      }
    }

    console.log(`연차 소멸 처리 완료: ${memberName}님`)
  }

  // 누락된 연간 부여 정보 계산 (개별 부여용) - serviceYears 추가
  public calculateMissedAnnualGrants(
    joinDate: Date,
    targetDate: Date,
    transactions: AnnualLeaveTransaction[],
  ): { amount: number; reason: string; serviceYears: number; anniversaryDate: Date }[] {
    // 현재 연차 구간 파악
    const currentAnniversaryYear = this.getCurrentAnniversaryYear(joinDate, targetDate)
    const currentServiceYears = currentAnniversaryYear - joinDate.getFullYear()

    // 현재 구간의 연차가 이미 부여되었는지 확인
    const hasCurrentYearGrant = transactions.some(
      (t) =>
        t.transaction_type === "grant" &&
        t.grant_date &&
        new Date(t.grant_date).getFullYear() === currentAnniversaryYear &&
        t.reason.includes("연간 부여"),
    )

    if (hasCurrentYearGrant) {
      console.log(`  현재 ${currentServiceYears}년차 연차는 이미 부여됨`)
      return []
    }

    // 현재 구간의 연차만 반환
    const annualDays = this.calculateAnnualDays(currentServiceYears)
    const anniversaryDate = new Date(joinDate)
    anniversaryDate.setFullYear(currentAnniversaryYear)

    console.log(`  현재 구간 ${currentServiceYears}년차 연차 소급 부여: ${annualDays}일`)

    return [
      {
        amount: annualDays,
        reason: `연간 부여 (입사 ${currentServiceYears}년차)`,
        serviceYears: currentServiceYears,
        anniversaryDate: anniversaryDate,
      },
    ]
  }
}

// 자동 업데이트 함수 - 과거 날짜 소급 적용 지원
export async function runDailyAnnualLeaveUpdate(targetDate: Date = new Date()): Promise<{
  processed: number
  granted: number
  expired: number
  errors: string[]
}> {
  const engine = new AnnualLeavePolicyEngine()
  const results = {
    processed: 0,
    granted: 0,
    expired: 0,
    errors: [] as string[],
  }

  try {
    const calculations = await engine.calculateAnnualLeaveForDate(targetDate)

    for (const calc of calculations) {
      try {
        results.processed++

        // 부여 처리 (과거 누락분 포함)
        if (calc.should_grant_today > 0) {
          if (calc.current_phase === "first_year") {
            // 월별 부여: 각 개월차별로 개별 부여 (과거 부여일로 소급)
            const member = await supabase.from("members").select("join_date").eq("id", calc.member_id).single()
            if (member.data) {
              const joinDate = new Date(member.data.join_date)
              const transactions = await supabaseAnnualLeaveStorageV2.getActiveTransactionsByMemberId(calc.member_id)
              const missedGrants = engine.calculateMissedMonthlyGrants(joinDate, targetDate, transactions)

              // 각 누락된 개월차별로 실제 부여일로 소급 부여
              for (const grantInfo of missedGrants) {
                await engine.grantAnnualLeave(
                  calc.member_id,
                  calc.member_name,
                  grantInfo.amount,
                  grantInfo.reason,
                  grantInfo.grantDate, // 실제 부여일로 소급 적용
                  "SYSTEM",
                )
                results.granted += grantInfo.amount
              }
            }
          } else {
            // 연간 부여: 각 누락된 기념일별로 개별 부여 (과거 기념일로 소급)
            const member = await supabase.from("members").select("join_date").eq("id", calc.member_id).single()
            if (member.data) {
              const joinDate = new Date(member.data.join_date)
              const transactions = await supabaseAnnualLeaveStorageV2.getActiveTransactionsByMemberId(calc.member_id)
              const missedGrants = engine.calculateMissedAnnualGrants(joinDate, targetDate, transactions)

              // 각 누락된 기념일별로 실제 기념일로 소급 부여
              for (const grantInfo of missedGrants) {
                const anniversaryDate = new Date(joinDate)
                anniversaryDate.setFullYear(joinDate.getFullYear() + grantInfo.serviceYears)

                await engine.grantAnnualLeave(
                  calc.member_id,
                  calc.member_name,
                  grantInfo.amount,
                  grantInfo.reason,
                  grantInfo.anniversaryDate, // 실제 기념일로 소급 적용
                  "SYSTEM",
                )
                results.granted += grantInfo.amount
              }
            }
          }
        }

        // 소멸 처리 (과거 소멸일 포함)
        if (calc.should_expire_today > 0) {
          // 과거 소멸 예정이었던 연차들을 모두 처리
          await engine.processExpiredLeaves(calc.member_id, calc.member_name, targetDate)
          results.expired += calc.should_expire_today
        }
      } catch (error) {
        console.error(`구성원 ${calc.member_name} 처리 중 오류:`, error)
        results.errors.push(`${calc.member_name}: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
      }
    }
  } catch (error) {
    console.error("일일 연차 업데이트 실행 중 오류:", error)
    results.errors.push(`전체 처리 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
  }

  return results
}

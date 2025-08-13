"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import type { AnnualLeavePolicy } from "@/types/annual-leave"

interface AnnualLeavePolicyViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: AnnualLeavePolicy | null
}

export function AnnualLeavePolicyViewDialog({
  open,
  onOpenChange,
  policy,
}: AnnualLeavePolicyViewDialogProps) {
  if (!policy) return null

  // 근속년수별 연차 계산
  const calculateAnnualDaysByYear = (year: number): number => {
    if (year <= 2) return policy.base_annual_days
    const incrementPeriods = Math.floor((year - 1) / policy.increment_years)
    return Math.min(
      policy.base_annual_days + incrementPeriods * policy.increment_days,
      policy.max_annual_days
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6] !p-0">
        <DialogHeader className="text-left space-y-0 pb-2 px-6 pt-6">
          <DialogTitle className="text-[#0a0b0c] text-xl font-bold">
            회사 연차 정책 안내
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 px-6 pb-6">
          {/* 정책 요약 */}
          <Card className="bg-white border-[#f3f4f6]">
            <CardContent className="pt-6">
              <div>
                <h3 className="font-semibold text-[#0a0b0c] mb-2">{policy.policy_name}</h3>
                <p className="text-sm text-[#4a5568]">
                  입사 첫 해는 매월 {policy.first_year_monthly_grant}일씩 최대 {policy.first_year_max_days}일까지, 
                  1년 후부터는 연 {policy.base_annual_days}일부터 시작하여 최대 {policy.max_annual_days}일까지 부여됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 입사 첫 해 (월별 부여) */}
          <Card className="bg-white border-[#f3f4f6]">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-[#0a0b0c] mb-2">입사 첫 해 (월별 부여)</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#4a5568]">
                      입사일부터 1년간은 <span className="font-semibold text-[#0a0b0c]">매월 입사일과 같은 날</span>에 
                      <span className="font-semibold text-[#0a0b0c]"> {policy.first_year_monthly_grant}일</span>씩 부여됩니다.
                    </p>
                    <div className="p-3 bg-[#fafbfb] rounded-lg space-y-1">
                      <p className="text-[#0a0b0c]">📅 예시: 7월 17일 입사</p>
                      <p className="text-[#4a5568] ml-4">• 7월 17일: 1일 부여</p>
                      <p className="text-[#4a5568] ml-4">• 8월 17일: 1일 추가 (총 2일)</p>
                      <p className="text-[#4a5568] ml-4">• 9월 17일: 1일 추가 (총 3일)</p>
                      <p className="text-[#4a5568] ml-4">• ... 최대 {policy.first_year_max_days}일까지</p>
                    </div>
                    <div className="p-2 bg-[#fff7ed] rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-[#ea580c] mt-0.5" />
                      <p className="text-[#ea580c] text-xs">
                        입사 1주년이 되는 날 자정에 사용하지 않은 첫 해 연차는 모두 소멸됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 입사 1년 후 (연간 부여) */}
          <Card className="bg-white border-[#f3f4f6]">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-[#0a0b0c] mb-2">입사 1년 후 (연간 부여)</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#4a5568]">
                      입사 1주년부터는 <span className="font-semibold text-[#0a0b0c]">매년 입사기념일</span>에 
                      그 해의 연차가 <span className="font-semibold text-[#0a0b0c]">일괄 부여</span>됩니다.
                    </p>
                    
                    {/* 근속년수별 연차 테이블 */}
                    <div className="mt-3">
                      <p className="font-medium text-[#0a0b0c] mb-2">근속년수별 연차 부여 일수</p>
                      <div className="border border-[#f3f4f6] rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-[#fafbfb]">
                            <tr>
                              <th className="px-3 py-2 text-left text-[#0a0b0c]">근속년수</th>
                              <th className="px-3 py-2 text-center text-[#0a0b0c]">연차 일수</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f3f4f6]">
                            <tr>
                              <td className="px-3 py-2 text-[#4a5568]">1~2년차</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#0a0b0c]">{policy.base_annual_days}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-[#4a5568]">3~4년차</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#0a0b0c]">{calculateAnnualDaysByYear(3)}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-[#4a5568]">5~6년차</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#0a0b0c]">{calculateAnnualDaysByYear(5)}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-[#4a5568]">7~8년차</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#0a0b0c]">{calculateAnnualDaysByYear(7)}일</td>
                            </tr>
                            {calculateAnnualDaysByYear(9) < policy.max_annual_days && (
                              <>
                                <tr>
                                  <td className="px-3 py-2 text-[#4a5568]">9~10년차</td>
                                  <td className="px-3 py-2 text-center font-semibold text-[#0a0b0c]">{calculateAnnualDaysByYear(9)}일</td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2 text-center text-[#718096]" colSpan={2}>...</td>
                                </tr>
                              </>
                            )}
                            <tr className="bg-[#eff6ff]">
                              <td className="px-3 py-2 text-[#0a0b0c] font-medium">최대</td>
                              <td className="px-3 py-2 text-center font-bold text-[#5e6ad2]">{policy.max_annual_days}일</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-2 bg-[#fff7ed] rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-[#ea580c] mt-0.5" />
                      <p className="text-[#ea580c] text-xs">
                        매년 입사기념일 자정에 전년도 미사용 연차는 소멸되고 새로운 연차가 부여됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 시뮬레이션 예시 */}
          <Card className="border-[#dbeafe] bg-[#eff6ff]/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-[#0a0b0c] mb-2">실제 적용 예시</h4>
                  <div className="text-sm space-y-2">
                    <p className="text-[#0a0b0c] font-medium">2024년 7월 17일 입사한 김직원님의 경우:</p>
                    <div className="space-y-1 ml-4 text-[#4a5568]">
                      <p>• 2024.07.17 ~ 2025.07.16: 매월 1일씩 최대 11일 부여</p>
                      <p>• 2025.07.17: 첫해 미사용 연차 소멸 + 15일 신규 부여</p>
                      <p>• 2026.07.17: 전년 미사용 연차 소멸 + 15일 신규 부여</p>
                      <p>• 2027.07.17: 전년 미사용 연차 소멸 + 16일 신규 부여 (3년차)</p>
                      <p>• 2029.07.17: 전년 미사용 연차 소멸 + 17일 신규 부여 (5년차)</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 중요 안내 */}
          <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-[#dc2626] mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[#dc2626] mb-1">연차 소멸 주의사항</p>
                <ul className="space-y-1 text-[#dc2626]">
                  <li>• 미사용 연차는 자동으로 소멸되며 금전적 보상은 없습니다</li>
                  <li>• 퇴사 시 미사용 연차에 대한 보상은 회사 정책에 따릅니다</li>
                  <li>• 연차 사용은 사전 승인이 필요합니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
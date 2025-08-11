"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Gift, TrendingUp, AlertCircle, User } from "lucide-react"
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            회사 연차 정책 안내
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* 정책 요약 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">{policy.policy_name}</h3>
            <p className="text-sm text-blue-700">
              입사 첫 해는 매월 {policy.first_year_monthly_grant}일씩 최대 {policy.first_year_max_days}일까지, 
              1년 후부터는 연 {policy.base_annual_days}일부터 시작하여 최대 {policy.max_annual_days}일까지 부여됩니다.
            </p>
          </div>

          {/* 입사 첫 해 (월별 부여) */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">입사 첫 해 (월별 부여)</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      입사일부터 1년간은 <span className="font-semibold text-gray-900">매월 입사일과 같은 날</span>에 
                      <span className="font-semibold text-gray-900"> {policy.first_year_monthly_grant}일</span>씩 부여됩니다.
                    </p>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p className="text-gray-700">📅 예시: 7월 17일 입사</p>
                      <p className="text-gray-600 ml-4">• 7월 17일: 1일 부여</p>
                      <p className="text-gray-600 ml-4">• 8월 17일: 1일 추가 (총 2일)</p>
                      <p className="text-gray-600 ml-4">• 9월 17일: 1일 추가 (총 3일)</p>
                      <p className="text-gray-600 ml-4">• ... 최대 {policy.first_year_max_days}일까지</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      <p className="text-orange-700 text-xs">
                        입사 1주년이 되는 날 자정에 사용하지 않은 첫 해 연차는 모두 소멸됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 입사 1년 후 (연간 부여) */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Gift className="h-5 w-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">입사 1년 후 (연간 부여)</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      입사 1주년부터는 <span className="font-semibold text-gray-900">매년 입사기념일</span>에 
                      그 해의 연차가 <span className="font-semibold text-gray-900">일괄 부여</span>됩니다.
                    </p>
                    
                    {/* 근속년수별 연차 테이블 */}
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-2">근속년수별 연차 부여 일수</p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-700">근속년수</th>
                              <th className="px-3 py-2 text-center text-gray-700">연차 일수</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="px-3 py-2 text-gray-600">1~2년차</td>
                              <td className="px-3 py-2 text-center font-semibold">{policy.base_annual_days}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-gray-600">3~4년차</td>
                              <td className="px-3 py-2 text-center font-semibold">{calculateAnnualDaysByYear(3)}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-gray-600">5~6년차</td>
                              <td className="px-3 py-2 text-center font-semibold">{calculateAnnualDaysByYear(5)}일</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-gray-600">7~8년차</td>
                              <td className="px-3 py-2 text-center font-semibold">{calculateAnnualDaysByYear(7)}일</td>
                            </tr>
                            {calculateAnnualDaysByYear(9) < policy.max_annual_days && (
                              <>
                                <tr>
                                  <td className="px-3 py-2 text-gray-600">9~10년차</td>
                                  <td className="px-3 py-2 text-center font-semibold">{calculateAnnualDaysByYear(9)}일</td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2 text-center text-gray-400" colSpan={2}>...</td>
                                </tr>
                              </>
                            )}
                            <tr className="bg-blue-50">
                              <td className="px-3 py-2 text-gray-700 font-medium">최대</td>
                              <td className="px-3 py-2 text-center font-bold text-blue-700">{policy.max_annual_days}일</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-2 bg-orange-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      <p className="text-orange-700 text-xs">
                        매년 입사기념일 자정에 전년도 미사용 연차는 소멸되고 새로운 연차가 부여됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 시뮬레이션 예시 */}
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <User className="h-5 w-5 text-indigo-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">실제 적용 예시</h4>
                  <div className="text-sm space-y-2">
                    <p className="text-gray-700 font-medium">2024년 7월 17일 입사한 김직원님의 경우:</p>
                    <div className="space-y-1 ml-4 text-gray-600">
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-900 mb-1">연차 소멸 주의사항</p>
                <ul className="space-y-1 text-red-700">
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
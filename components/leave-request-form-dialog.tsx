"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarDays, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { LeaveRequestFormData, LeaveType } from "@/types/leave-request"
import type { WorkTypeType } from "@/types/work-type"

interface LeaveRequestFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  currentBalance: number
  memberId: string
}

export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  onSubmit,
  currentBalance,
  memberId,
}: LeaveRequestFormDialogProps) {
  const [formData, setFormData] = useState<LeaveRequestFormData>({
    leave_type: "연차",
    start_date: "",
    end_date: "",
    reason: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<WorkTypeType[]>([])
  const [earliestExpireDate, setEarliestExpireDate] = useState<string | null>(null)
  const [expireWarning, setExpireWarning] = useState<string | null>(null)
  const [grantCount, setGrantCount] = useState(0) // 부여 개수 추가
  const [expiryInfo, setExpiryInfo] = useState<{ date: string; amount: number }[]>([]) // 소멸 정보 배열

  // 휴가 유형 불러오기 및 소멸일 확인
  useEffect(() => {
    if (open) {
      loadLeaveTypes()
      loadExpireDates()
    }
  }, [open])

  const loadLeaveTypes = async () => {
    try {
      const workTypes = await supabaseWorkTypeStorage.getWorkTypes()
      // is_leave가 true인 휴가 유형만 필터링
      const leaveTypesList = workTypes.filter(wt => 
        wt.is_leave === true
      )
      setLeaveTypes(leaveTypesList)
      
      // 기본값을 첫 번째 휴가 유형으로 설정
      if (leaveTypesList.length > 0) {
        setFormData(prev => ({ ...prev, leave_type: leaveTypesList[0].name as LeaveType }))
      }
    } catch (error) {
      console.error("휴가 유형 로드 실패:", error)
    }
  }
  
  const loadExpireDates = async () => {
    try {
      // V2 스토리지에서 사용 가능한 부여 조회
      const { supabaseAnnualLeaveStorageV2 } = await import("@/lib/supabase-annual-leave-storage-v2")
      const availableGrants = await supabaseAnnualLeaveStorageV2.getAvailableGrants(memberId)
      
      // 부여 개수 저장
      setGrantCount(availableGrants.length)
      
      // 소멸일별로 그룹화
      const expiryGroups = new Map<string, number>()
      for (const grant of availableGrants) {
        if (grant.expire_date) {
          const current = expiryGroups.get(grant.expire_date) || 0
          expiryGroups.set(grant.expire_date, current + ((grant as any).availableAmount || grant.amount))
        }
      }
      
      // 소멸일 정보 배열 생성 (날짜순 정렬)
      const expiryArray = Array.from(expiryGroups.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      setExpiryInfo(expiryArray)
      
      // 가장 빠른 소멸일 저장
      if (expiryArray.length > 0) {
        setEarliestExpireDate(expiryArray[0].date)
      }
    } catch (error) {
      console.error("소멸일 정보 로드 실패:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 기본 유효성 검사
      if (!formData.start_date) {
        throw new Error("시작일을 선택해주세요.")
      }

      if (!formData.end_date) {
        throw new Error("종료일을 선택해주세요.")
      }

      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        throw new Error("종료일은 시작일보다 늦어야 합니다.")
      }

      // 1일이 아닌 휴가 유형은 단일 날짜만 허용 (반차, 특별휴가 등)
      const selectedLeaveType = leaveTypes.find(lt => lt.name === formData.leave_type)
      if (selectedLeaveType && selectedLeaveType.deduction_days !== 1 && formData.start_date !== formData.end_date) {
        throw new Error("해당 휴가 유형은 단일 날짜만 선택 가능합니다.")
      }

      // 과거 날짜 신청 허용 (취소 후 재신청, 사후 신청 등 고려)
      // 과거 날짜 제한 제거

      // 연차 신청 생성
      await supabaseLeaveRequestStorage.createLeaveRequest(formData, memberId)
      
      // 폼 초기화
      const firstLeaveType = leaveTypes.length > 0 ? leaveTypes[0].name as LeaveType : "연차"
      setFormData({
        leave_type: firstLeaveType,
        start_date: "",
        end_date: "",
        reason: "",
      })
      
      onSubmit()
    } catch (error) {
      console.error("연차 신청 오류:", error)
      setError(error instanceof Error ? error.message : "연차 신청 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveTypeChange = (value: LeaveType) => {
    setFormData((prev) => {
      const newData = { ...prev, leave_type: value }
      
      // 1일이 아닌 휴가 선택 시 종료일을 시작일과 동일하게 설정 (반차 등)
      const selectedLeaveType = leaveTypes.find(lt => lt.name === value)
      if (selectedLeaveType && selectedLeaveType.deduction_days !== 1 && prev.start_date) {
        newData.end_date = prev.start_date
      }
      
      return newData
    })
  }

  const handleStartDateChange = (value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, start_date: value }
      
      // 1일이 아닌 휴가이거나 종료일이 없으면 종료일을 시작일과 동일하게 설정
      const selectedLeaveType = leaveTypes.find(lt => lt.name === prev.leave_type)
      if ((selectedLeaveType && selectedLeaveType.deduction_days !== 1) || !prev.end_date) {
        newData.end_date = value
      }
      
      // 소멸일 검증
      checkExpireDate(value, newData.end_date)
      
      return newData
    })
  }
  
  const handleEndDateChange = (value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, end_date: value }
      
      // 소멸일 검증
      checkExpireDate(newData.start_date, value)
      
      return newData
    })
  }
  
  const checkExpireDate = (startDate: string, endDate: string) => {
    if (earliestExpireDate && endDate) {
      const requestEnd = new Date(endDate)
      const requestStart = new Date(startDate)
      const expireDate = new Date(earliestExpireDate)
      
      // 신청 시작일이 소멸일 이후인 경우
      if (requestStart > expireDate) {
        if (grantCount === 1) {
          setExpireWarning(
            `보유하신 연차가 ${expireDate.toLocaleDateString("ko-KR")}에 모두 소멸 예정이므로, ` +
            `해당 날짜 이후에는 사용할 수 없습니다.`
          )
        } else {
          setExpireWarning(
            `모든 연차가 ${expireDate.toLocaleDateString("ko-KR")}까지 소멸 예정이므로, ` +
            `해당 날짜 이후에는 사용할 수 없습니다.`
          )
        }
      }
      // 신청 종료일이 소멸일 이후인 경우
      else if (requestEnd > expireDate) {
        if (grantCount === 1) {
          setExpireWarning(
            `보유하신 연차가 ${expireDate.toLocaleDateString("ko-KR")}에 소멸 예정입니다. ` +
            `해당 날짜까지만 사용 가능합니다.`
          )
        } else {
          setExpireWarning(
            `일부 연차가 ${expireDate.toLocaleDateString("ko-KR")}에 소멸 예정입니다. ` +
            `해당 날짜 이후 사용분은 다른 연차로 자동 배정되며, 잔여 연차가 부족한 경우 신청이 거부될 수 있습니다.`
          )
        }
      } else {
        setExpireWarning(null)
      }
    } else {
      setExpireWarning(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            연차 신청
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 현재 잔여 연차 표시 */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">
              현재 잔여 연차: <span className="text-lg font-bold">{currentBalance}일</span>
            </div>
          </div>

          {/* 연차 유형 */}
          <div className="space-y-2">
            <Label htmlFor="leave-type">연차 유형</Label>
            <Select 
              value={formData.leave_type} 
              onValueChange={handleLeaveTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="연차 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((leaveType) => (
                  <SelectItem key={leaveType.id} value={leaveType.name}>
                    {leaveType.name} ({leaveType.deduction_days}일)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 시작일 */}
          <div className="space-y-2">
            <Label htmlFor="start-date">시작일</Label>
            <Input
              id="start-date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleStartDateChange(e.target.value)}
              // min={new Date().toISOString().split("T")[0]} // 과거 날짜 제한 제거
              required
            />
          </div>

          {/* 종료일 */}
          <div className="space-y-2">
            <Label htmlFor="end-date">종료일</Label>
            <Input
              id="end-date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={formData.start_date} // 과거 날짜 제한 제거, 시작일보다 이른 날짜는 방지
              // max 제거 - 다른 부여로 사용 가능할 수 있음
              disabled={(() => {
                const selectedLeaveType = leaveTypes.find(lt => lt.name === formData.leave_type)
                return selectedLeaveType && selectedLeaveType.deduction_days !== 1
              })()}
              required
            />
          </div>

          {/* 소멸일 경고 메시지 */}
          {expireWarning && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {expireWarning}
              </AlertDescription>
            </Alert>
          )}
          
          {/* 단일 날짜 휴가 안내 메시지 */}
          {(() => {
            const selectedLeaveType = leaveTypes.find(lt => lt.name === formData.leave_type)
            return selectedLeaveType && selectedLeaveType.deduction_days !== 1
          })() && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>안내:</strong> 해당 휴가 유형은 단일 날짜만 신청 가능합니다.
              </div>
            </div>
          )}
          
          {/* 소멸일 정보 표시 */}
          {expiryInfo.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg space-y-2">
              {expiryInfo.length === 1 ? (
                // 소멸일이 1개인 경우: 간단하게 표시
                <div className="text-sm text-blue-800">
                  <strong>연차 소멸 예정:</strong> {new Date(expiryInfo[0].date).toLocaleDateString("ko-KR")}에 {expiryInfo[0].amount}일
                </div>
              ) : (
                // 소멸일이 여러 개인 경우: 가장 가까운 것 강조 + 나머지 작게
                <>
                  <div className="text-sm text-blue-900 font-medium">
                    <strong>🔔 다음 소멸:</strong> {new Date(expiryInfo[0].date).toLocaleDateString("ko-KR")}에 {expiryInfo[0].amount}일
                  </div>
                  {expiryInfo.length === 2 ? (
                    // 2개인 경우: 나머지 1개도 표시
                    <div className="text-xs text-blue-700 pl-6">
                      이후: {new Date(expiryInfo[1].date).toLocaleDateString("ko-KR")}에 {expiryInfo[1].amount}일
                    </div>
                  ) : (
                    // 3개 이상인 경우: 축약 표시
                    <div className="text-xs text-blue-700 pl-6">
                      그 외 {expiryInfo.length - 1}건의 소멸 예정 (총 {expiryInfo.slice(1).reduce((sum, info) => sum + info.amount, 0)}일)
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">사유 (선택)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="연차 사용 사유를 입력하세요 (선택사항)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading || currentBalance <= 0}>
              {loading ? "신청 중..." : "신청하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
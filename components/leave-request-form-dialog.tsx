"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarDays, AlertCircle, CalendarIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import { supabase } from "@/lib/supabase"
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
  const [calculatedDays, setCalculatedDays] = useState<number>(0) // 계산된 연차 사용 일수
  const [missingScheduleDates, setMissingScheduleDates] = useState<string[]>([]) // 근무표 미등록 날짜
  const [isCalculating, setIsCalculating] = useState(false) // 계산 중 상태
  const [startDateOpen, setStartDateOpen] = useState(false) // 시작일 popover 상태
  const [endDateOpen, setEndDateOpen] = useState(false) // 종료일 popover 상태

  // 휴가 유형 불러오기 및 폼 초기화
  useEffect(() => {
    if (open) {
      loadLeaveTypes()
      // 다이얼로그 열 때 폼 초기화
      setFormData({
        leave_type: "연차",
        start_date: "",
        end_date: "",
        reason: "",
      })
      setCalculatedDays(0)
      setMissingScheduleDates([])
      setError(null)
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
      const newData = { 
        ...prev, 
        leave_type: value,
        start_date: "",  // 시작일 초기화
        end_date: ""      // 종료일 초기화
      }
      
      return newData
    })
    // 계산 관련 상태도 초기화
    setCalculatedDays(0)
    setMissingScheduleDates([])
  }

  // 연차 사용 일수 계산 및 근무표 확인 (실제 근무표 기반, 오프일 제외)
  const calculateLeaveDays = async (startDate: string, endDate: string, leaveType: string): Promise<number> => {
    if (!startDate || !endDate) return 0
    
    const selectedLeaveType = leaveTypes.find(lt => lt.name === leaveType)
    const deductionDays = selectedLeaveType?.deduction_days || 1
    
    try {
      // 해당 기간의 근무 스케줄 조회
      const { data: scheduleEntries, error } = await supabase
        .from("work_schedule_entries")
        .select("date, work_type_id")
        .eq("member_id", memberId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
      
      if (error) {
        console.error("근무 스케줄 조회 오류:", error)
        return 0
      }
      
      // 근무 유형 정보 가져오기
      const { data: workTypes, error: workTypesError } = await supabase
        .from("work_types")
        .select("id, name, is_holiday")
      
      if (workTypesError) {
        console.error("근무 유형 조회 오류:", workTypesError)
        return 0
      }
      
      // work_type_id를 name과 is_holiday로 매핑
      const workTypeMap = new Map(workTypes?.map(wt => [wt.id, { name: wt.name, is_holiday: wt.is_holiday }]) || [])
      
      // 근무표 미등록 날짜 추적
      const missingDates: string[] = []
      
      // 단일 날짜 휴가인 경우 (반차 등)
      if (deductionDays !== 1) {
        const entry = scheduleEntries?.find(e => e.date === startDate)
        if (!entry) {
          // 근무 스케줄이 없으면 미등록으로 기록
          console.log(`${startDate}: 근무 스케줄 미등록`)
          missingDates.push(startDate)
          setMissingScheduleDates([startDate])
          return -1 // 오류 표시용
        }
        const workTypeInfo = workTypeMap.get(entry.work_type_id)
        const workTypeName = workTypeInfo?.name
        const isHoliday = workTypeInfo?.is_holiday === true
        console.log(`${startDate}: ${workTypeName} ${isHoliday ? '(휴무일 - 연차 0일 차감)' : '(근무일)'}`)
        setMissingScheduleDates([])
        return isHoliday ? 0 : deductionDays // 휴무일은 0일 차감
      }
      
      // 전체 기간 연차인 경우
      let count = 0
      const start = new Date(startDate)
      const end = new Date(endDate)
      const current = new Date(start)
      
      const debugInfo: string[] = []
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const entry = scheduleEntries?.find(e => e.date === dateStr)
        
        if (!entry) {
          // 근무 스케줄이 없으면 미등록으로 기록
          debugInfo.push(`${dateStr}: 근무 스케줄 미등록`)
          missingDates.push(dateStr)
        } else {
          const workTypeInfo = workTypeMap.get(entry.work_type_id)
          const workTypeName = workTypeInfo?.name
          const isHoliday = workTypeInfo?.is_holiday === true
          debugInfo.push(`${dateStr}: ${workTypeName} ${isHoliday ? '(휴무일 - 제외)' : '(근무일 - 포함)'}`)
          
          if (!isHoliday) {
            count++ // 휴무일이 아닌 경우만 카운트
          }
        }
        
        current.setDate(current.getDate() + 1)
      }
      
      console.log('근무 스케줄 상세:', debugInfo)
      console.log('미등록 날짜:', missingDates)
      console.log('총 근무일수 (연차 차감일수):', count)
      
      // 미등록 날짜 업데이트
      setMissingScheduleDates(missingDates)
      
      // 미등록 날짜가 있으면 -1 반환 (오류 표시용)
      if (missingDates.length > 0) {
        return -1
      }
      
      return count
    } catch (error) {
      console.error("연차 일수 계산 오류:", error)
      return 0
    }
  }

  // 날짜 변경 시 연차 사용 일수 재계산
  useEffect(() => {
    const updateCalculatedDays = async () => {
      if (formData.start_date && formData.end_date) {
        setIsCalculating(true)
        const days = await calculateLeaveDays(formData.start_date, formData.end_date, formData.leave_type)
        setCalculatedDays(days)
        setIsCalculating(false)
      } else {
        setCalculatedDays(0)
        setIsCalculating(false)
      }
    }
    
    updateCalculatedDays()
  }, [formData.start_date, formData.end_date, formData.leave_type, memberId])

  const handleStartDateChange = (value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, start_date: value }
      
      // 종료일 리셋
      newData.end_date = ""
      
      // 1일이 아닌 휴가(반차 등)인 경우에만 종료일을 시작일과 동일하게 설정
      const selectedLeaveType = leaveTypes.find(lt => lt.name === prev.leave_type)
      if (selectedLeaveType && selectedLeaveType.deduction_days !== 1) {
        newData.end_date = value
      }
      
      return newData
    })
    setStartDateOpen(false) // popover 닫기
  }
  
  const handleEndDateChange = (value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, end_date: value }
      return newData
    })
    setEndDateOpen(false) // popover 닫기
  }

  // 다이얼로그 닫기 처리 (폼 리셋 포함)
  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      // 다이얼로그 닫을 때 폼 초기화
      setFormData({
        leave_type: "연차",
        start_date: "",
        end_date: "",
        reason: "",
      })
      setCalculatedDays(0)
      setMissingScheduleDates([])
      setError(null)
      setStartDateOpen(false)
      setEndDateOpen(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-left text-[#0a0b0c]">
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
          <div className="p-4 bg-[#fafbfb] border border-[#f3f4f6] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4a5568]">잔여 연차</span>
              <span className="text-2xl font-bold text-[#5e6ad2]">{currentBalance}일</span>
            </div>
          </div>

          {/* 연차 유형 */}
          <div className="space-y-2">
            <Label htmlFor="leave-type" className="text-sm font-medium text-[#0a0b0c]">연차 유형</Label>
            <Select 
              value={formData.leave_type} 
              onValueChange={handleLeaveTypeChange}
            >
              <SelectTrigger className="bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]">
                <SelectValue placeholder="연차 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#f3f4f6]">
                {leaveTypes.map((leaveType) => (
                  <SelectItem 
                    key={leaveType.id} 
                    value={leaveType.name}
                    className="hover:bg-[#fafbfb] focus:bg-[#fafbfb] focus:text-[#0a0b0c]"
                  >
                    {leaveType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 시작일 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#0a0b0c]">시작일</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white border-[#f3f4f6] hover:bg-[#fafbfb] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]",
                    !formData.start_date && "text-[#718096]"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#718096]" />
                  {formData.start_date ? (
                    format(new Date(formData.start_date), "yyyy년 M월 d일", { locale: ko })
                  ) : (
                    <span>시작일을 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-[#f3f4f6]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.start_date ? new Date(formData.start_date) : undefined}
                  onSelect={(date) => handleStartDateChange(date ? format(date, "yyyy-MM-dd") : "")}
                  locale={ko}
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 종료일 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#0a0b0c]">종료일</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={(() => {
                    const selectedLeaveType = leaveTypes.find(lt => lt.name === formData.leave_type)
                    return selectedLeaveType && selectedLeaveType.deduction_days !== 1
                  })()}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white border-[#f3f4f6] hover:bg-[#fafbfb] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] disabled:bg-[#fafbfb] disabled:text-[#718096]",
                    !formData.end_date && "text-[#718096]"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#718096]" />
                  {formData.end_date ? (
                    format(new Date(formData.end_date), "yyyy년 M월 d일", { locale: ko })
                  ) : (
                    <span>종료일을 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-[#f3f4f6]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.end_date ? new Date(formData.end_date) : undefined}
                  onSelect={(date) => handleEndDateChange(date ? format(date, "yyyy-MM-dd") : "")}
                  locale={ko}
                  className="rounded-md"
                  disabled={(date) => {
                    if (!formData.start_date) return false
                    const dateStr = format(date, "yyyy-MM-dd")
                    return dateStr < formData.start_date
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 근무표 미등록 경고 */}
          {missingScheduleDates.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">근무표가 등록되지 않은 날짜가 포함되어 있습니다</div>
                <div className="text-sm mt-1">
                  관리자에게 근무표 등록을 요청해주세요.
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* 연차 사용 일수 표시 */}
          {formData.start_date && formData.end_date && missingScheduleDates.length === 0 && (
            <>
              {isCalculating ? (
                <div className="p-3 bg-[#fafbfb] rounded-lg border border-[#f3f4f6]">
                  <div className="text-sm font-medium text-[#718096]">
                    연차 일수 계산 중...
                  </div>
                </div>
              ) : calculatedDays === 0 ? (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">
                    선택한 날짜가 모두 휴무일입니다. 근무일이 포함된 날짜를 선택해주세요.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="p-3 border border-[#5e6ad2] rounded-lg bg-white">
                  <div className="text-center">
                    <p className="text-xs text-[#4a5568]">사용 예정 연차</p>
                    <p className="text-2xl font-bold text-[#5e6ad2] mt-1">{calculatedDays}일</p>
                    {calculatedDays > currentBalance && (
                      <p className="text-xs text-red-600 mt-1">잔여 연차 부족</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          

          {/* 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-[#0a0b0c]">사유 (선택)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="연차 사용 사유를 입력하세요 (선택사항)"
              rows={3}
              className="bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] resize-none"
            />
          </div>

          <DialogFooter className="!flex !flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={loading}
              className="flex-1 border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={loading || currentBalance <= 0 || missingScheduleDates.length > 0 || (!!formData.start_date && !!formData.end_date && calculatedDays === 0)}
              className="flex-1 bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
            >
              {loading ? "신청 중..." : "신청하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
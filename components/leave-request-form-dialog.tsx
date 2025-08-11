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

  // 휴가 유형 불러오기
  useEffect(() => {
    if (open) {
      loadLeaveTypes()
    }
  }, [open])

  const loadLeaveTypes = async () => {
    try {
      const workTypes = await supabaseWorkTypeStorage.getWorkTypes()
      // deduction_days가 있는 휴가 유형만 필터링
      const leaveTypesList = workTypes.filter(wt => 
        wt.deduction_days !== null && wt.deduction_days !== undefined
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
      const newData = { ...prev, leave_type: value }
      
      // 1일이 아닌 휴가 선택 시 종료일을 시작일과 동일하게 설정
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
      
      return newData
    })
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
              onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
              min={formData.start_date} // 과거 날짜 제한 제거, 시작일보다 이른 날짜는 방지
              disabled={(() => {
                const selectedLeaveType = leaveTypes.find(lt => lt.name === formData.leave_type)
                return selectedLeaveType && selectedLeaveType.deduction_days !== 1
              })()}
              required
            />
          </div>

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
"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import { supabase } from "@/lib/supabase"
import type { AttendanceDetail } from "@/types/attendance"

interface AttendanceRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AttendanceDetail
  onComplete: () => void
  registeredBy: string
}

export function AttendanceRegisterDialog({
  open,
  onOpenChange,
  record,
  onComplete,
  registeredBy,
}: AttendanceRegisterDialogProps) {
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 시간 문자열을 분 단위로 변환
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  // 출퇴근 시간 기반 계산
  const calculateAttendanceMetrics = (
    checkIn?: string | null,
    checkOut?: string | null,
    scheduledStart?: string | null,
    scheduledEnd?: string | null,
    isHoliday?: boolean
  ) => {
    const result = {
      is_late: false,
      late_minutes: 0,
      is_early_leave: false,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      actual_work_minutes: 0,
    }
    
    if (!checkIn || !checkOut) return result
    
    // 실제 근무 시간 계산
    const checkInTime = timeToMinutes(checkIn)
    const checkOutTime = timeToMinutes(checkOut)
    result.actual_work_minutes = checkOutTime - checkInTime
    
    // 휴무일/오프/휴가에 출근한 경우: 전체 근무시간이 초과근무
    if (isHoliday || !scheduledStart || !scheduledEnd) {
      result.overtime_minutes = result.actual_work_minutes
      return result
    }
    
    // 정규 근무일 처리
    const scheduledStartTime = timeToMinutes(scheduledStart)
    const scheduledEndTime = timeToMinutes(scheduledEnd)
    
    // 지각 계산
    if (checkInTime > scheduledStartTime) {
      result.is_late = true
      result.late_minutes = checkInTime - scheduledStartTime
    }
    
    // 조기퇴근 계산
    if (checkOutTime < scheduledEndTime) {
      result.is_early_leave = true
      result.early_leave_minutes = scheduledEndTime - checkOutTime
    }
    
    // 초과근무 계산
    if (checkOutTime > scheduledEndTime) {
      result.overtime_minutes = checkOutTime - scheduledEndTime
    }
    
    return result
  }

  const handleSubmit = async () => {
    if (!checkInTime && !checkOutTime) {
      setError("출근 또는 퇴근 시간을 입력해주세요.")
      return
    }

    if (!reason.trim()) {
      setError("등록 사유를 입력해주세요.")
      return
    }

    // 시간 형식 검증
    const timePattern = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/
    if (checkInTime && !timePattern.test(checkInTime)) {
      setError("출근 시간 형식이 올바르지 않습니다. (HH:mm)")
      return
    }
    if (checkOutTime && !timePattern.test(checkOutTime)) {
      setError("퇴근 시간 형식이 올바르지 않습니다. (HH:mm)")
      return
    }
    
    // 출근 시간이 퇴근 시간보다 늦은지 검증
    if (checkInTime && checkOutTime) {
      const [inHour, inMinute] = checkInTime.split(':').map(Number)
      const [outHour, outMinute] = checkOutTime.split(':').map(Number)
      const inTotalMinutes = inHour * 60 + inMinute
      const outTotalMinutes = outHour * 60 + outMinute
      
      if (inTotalMinutes >= outTotalMinutes) {
        setError("출근 시간은 퇴근 시간보다 빨라야 합니다.")
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      // HH:mm 형식을 HH:mm:00으로 변환하여 저장
      const formatTimeForDB = (time: string) => {
        if (!time) return null
        return time.length === 5 ? `${time}:00` : time
      }
      
      // 1. 멤버 정보 가져오기
      const { data: memberInfo } = await supabase
        .from("members")
        .select("employee_number, name")
        .eq("id", record.member_id)
        .single()
        
      if (!memberInfo) {
        throw new Error("구성원 정보를 찾을 수 없습니다.")
      }
      
      // 2. 근무표 정보 조회 (CSV 업로드와 동일한 방식)
      const { data: schedule } = await supabase
        .from("work_schedule_entries")
        .select(`
          id,
          work_type_id,
          original_work_type_id,
          work_types!work_type_id (
            start_time,
            end_time,
            is_leave,
            is_holiday
          )
        `)
        .eq("member_id", record.member_id)
        .eq("date", record.work_date)
        .single()
      
      let scheduledStart = null
      let scheduledEnd = null
      let scheduleId = null
      let workTypeId = null
      let isHoliday = false
      
      if (schedule) {
        scheduleId = schedule.id
        workTypeId = schedule.work_type_id
        const workType = schedule.work_types
        
        if (workType) {
          if (workType.is_leave && schedule.original_work_type_id) {
            // 휴가인 경우 원래 근무 시간 조회
            const { data: originalWorkType } = await supabase
              .from("work_types")
              .select("start_time, end_time")
              .eq("id", schedule.original_work_type_id)
              .single()
            
            if (originalWorkType) {
              // 부분 휴가 처리 로직 (CSV 업로드와 동일)
              const leaveStart = timeToMinutes(workType.start_time)
              const leaveEnd = timeToMinutes(workType.end_time)
              const workStart = timeToMinutes(originalWorkType.start_time)
              const workEnd = timeToMinutes(originalWorkType.end_time)
              
              const isFullDayLeave = 
                (leaveStart === 0 && leaveEnd >= 1439) ||
                (leaveStart <= workStart && leaveEnd >= workEnd)
              
              if (!isFullDayLeave) {
                if (leaveStart <= workStart && leaveEnd > workStart && leaveEnd < workEnd) {
                  scheduledStart = workType.end_time
                  scheduledEnd = originalWorkType.end_time
                } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
                  scheduledStart = originalWorkType.start_time
                  scheduledEnd = workType.start_time
                }
              } else {
                isHoliday = true
              }
            } else {
              isHoliday = true
            }
          } else if (workType.is_leave || workType.is_holiday) {
            isHoliday = true
          } else {
            scheduledStart = workType.start_time
            scheduledEnd = workType.end_time
          }
        }
      } else {
        // 근무표가 없으면 record에서 가져오기
        scheduledStart = record.scheduled_start_time
        scheduledEnd = record.scheduled_end_time
        isHoliday = record.is_holiday || false
      }
      
      // 3. 지각, 조기퇴근, 초과근무 계산
      const calculations = calculateAttendanceMetrics(
        formatTimeForDB(checkInTime),
        formatTimeForDB(checkOutTime),
        scheduledStart,
        scheduledEnd,
        isHoliday
      )
      
      // 4. 모든 데이터를 한 번에 upsert (CSV 업로드와 동일한 방식)
      const attendanceData = {
        member_id: record.member_id,
        employee_number: memberInfo.employee_number,
        member_name: memberInfo.name,
        work_date: record.work_date,
        check_in_time: formatTimeForDB(checkInTime),
        check_out_time: formatTimeForDB(checkOutTime),
        schedule_id: scheduleId,
        work_type_id: workTypeId,
        scheduled_start_time: scheduledStart,
        scheduled_end_time: scheduledEnd,
        ...calculations,  // 계산된 값들 포함
        updated_at: new Date().toISOString(),
      }
      
      // 기존 레코드가 있는지 확인
      const { data: existingRecords } = await supabase
        .from("attendance_records")
        .select("id, is_modified")
        .eq("employee_number", memberInfo.employee_number)
        .eq("work_date", record.work_date)
      
      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null
      
      if (existingRecord) {
        // 기존 레코드 업데이트
        attendanceData.is_modified = true
        attendanceData.modified_at = new Date().toISOString()
        attendanceData.modified_by = registeredBy
        attendanceData.modification_reason = reason
      } else {
        // 새 레코드
        attendanceData.created_at = new Date().toISOString()
      }
      
      // upsert 실행
      const { data: upsertedRecord, error } = await supabase
        .from("attendance_records")
        .upsert(attendanceData, {
          onConflict: 'employee_number,work_date'
        })
        .select("id")
        .single()
      
      if (error) throw error
      
      // 5. 근무 마일리지 업데이트
      const recordId = upsertedRecord?.id || existingRecord?.id
      if (recordId) {
        const { supabaseWorkMileageStorage } = await import("@/lib/supabase-work-mileage-storage")
        await supabaseWorkMileageStorage.syncFromAttendance(
          record.member_id,
          record.work_date,
          recordId,
          calculations.late_minutes,
          calculations.early_leave_minutes,
          calculations.overtime_minutes,
          'manual'  // 수동 등록
        )
      }

      // 다이얼로그 닫고 데이터 새로고침
      handleClose()
      onComplete()
    } catch (error) {
      console.error("근태 등록 오류:", error)
      setError(error instanceof Error ? error.message : "등록 중 오류가 발생했습니다.")
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setCheckInTime("")
      setCheckOutTime("")
      setReason("")
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0a0b0c]">근태 등록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 날짜 및 구성원 정보 */}
          <div className="bg-[#fafbfb] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">날짜</span>
              <span className="text-sm font-medium text-[#0a0b0c]">
                {format(new Date(record.work_date), "yyyy년 M월 d일 (E)", { locale: ko })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">구성원</span>
              <span className="text-sm font-medium text-[#0a0b0c]">{record.member_name}</span>
            </div>
            {record.scheduled_start_time && record.scheduled_end_time && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718096]">근무 예정</span>
                <span className="text-sm font-medium text-[#0a0b0c]">
                  {record.scheduled_start_time.slice(0, 5)} ~ {record.scheduled_end_time.slice(0, 5)}
                </span>
              </div>
            )}
          </div>

          {/* 시간 입력 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in" className="text-sm font-medium text-[#4a5568]">
                출근 시간
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
                <Input
                  id="check-in"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="pl-10 bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"
                  placeholder="09:00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check-out" className="text-sm font-medium text-[#4a5568]">
                퇴근 시간
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
                <Input
                  id="check-out"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="pl-10 bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"
                  placeholder="18:00"
                />
              </div>
            </div>
          </div>

          {/* 사유 입력 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-[#4a5568]">
              등록 사유 <span className="text-[#dc2626]">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="근태 등록 사유를 입력해주세요. (예: 시스템 오류로 인한 누락)"
              className="min-h-[80px] bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-[#5e6ad2] resize-none"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-[#dc2626]" />
              <AlertDescription className="text-[#dc2626]">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={submitting}
            className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
          >
            {submitting ? "등록 중..." : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
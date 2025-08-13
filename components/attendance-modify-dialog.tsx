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
import type { AttendanceDetail } from "@/types/attendance"

interface AttendanceModifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AttendanceDetail
  onComplete: () => void
  modifiedBy: string
}

export function AttendanceModifyDialog({
  open,
  onOpenChange,
  record,
  onComplete,
  modifiedBy,
}: AttendanceModifyDialogProps) {
  // 시간 형식을 HH:mm으로 변환 (seconds 제거)
  const formatTimeToHHMM = (time: string | null) => {
    if (!time) return ""
    return time.slice(0, 5) // "HH:mm:ss" -> "HH:mm"
  }
  
  const [checkInTime, setCheckInTime] = useState(formatTimeToHHMM(record.check_in_time))
  const [checkOutTime, setCheckOutTime] = useState(formatTimeToHHMM(record.check_out_time))
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("수정 사유를 입력해주세요.")
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

    setSubmitting(true)
    setError(null)

    try {
      // HH:mm 형식을 HH:mm:00으로 변환하여 저장
      const formatTimeForDB = (time: string) => {
        if (!time) return null
        return time.length === 5 ? `${time}:00` : time
      }
      
      await supabaseAttendanceStorage.modifyAttendanceRecord({
        record_id: record.id,
        check_in_time: formatTimeForDB(checkInTime),
        check_out_time: formatTimeForDB(checkOutTime),
        modification_reason: reason,
        modified_by: modifiedBy,
      })

      onComplete()
    } catch (error) {
      console.error("근태 수정 오류:", error)
      setError(error instanceof Error ? error.message : "수정 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setCheckInTime(formatTimeToHHMM(record.check_in_time))
      setCheckOutTime(formatTimeToHHMM(record.check_out_time))
      setReason("")
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-left text-[#0a0b0c]">
            근태 기록 수정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="bg-[#fafbfb] rounded-lg p-4 space-y-2 border border-[#f3f4f6]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">날짜</span>
              <span className="font-medium text-[#0a0b0c]">
                {format(new Date(record.work_date), "yy.M.d(E)", { locale: ko })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">이름</span>
              <span className="font-medium text-[#0a0b0c]">{record.member_name}</span>
            </div>
            {record.work_type_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718096]">근무유형</span>
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: record.work_type_bgcolor || "#f3f4f6",
                    color: record.work_type_fontcolor || "#4a5568",
                  }}
                >
                  {record.work_type_name}
                </span>
              </div>
            )}
            {record.scheduled_start_time && record.scheduled_end_time && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718096]">정규 근무시간</span>
                <span className="font-medium text-[#0a0b0c]">
                  {formatTimeToHHMM(record.scheduled_start_time)} ~ {formatTimeToHHMM(record.scheduled_end_time)}
                </span>
              </div>
            )}
          </div>

          {/* 출퇴근 시간 입력 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in">
                <Clock className="inline-block h-4 w-4 mr-1" />
                출근 시간
              </Label>
              <Input
                id="check-in"
                type="text"
                placeholder="09:00"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                disabled={submitting}
                className="bg-[#fafbfb] border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
              />
              {record.check_in_time && checkInTime !== formatTimeToHHMM(record.check_in_time) && (
                <p className="text-xs text-[#718096]">
                  기존: {formatTimeToHHMM(record.check_in_time)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="check-out">
                <Clock className="inline-block h-4 w-4 mr-1" />
                퇴근 시간
              </Label>
              <Input
                id="check-out"
                type="text"
                placeholder="18:00"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                disabled={submitting}
                className="bg-[#fafbfb] border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
              />
              {record.check_out_time && checkOutTime !== formatTimeToHHMM(record.check_out_time) && (
                <p className="text-xs text-[#718096]">
                  기존: {formatTimeToHHMM(record.check_out_time)}
                </p>
              )}
            </div>
          </div>

          {/* 수정 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-[#0a0b0c]">
              수정 사유 <span className="text-[#dc2626]">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="수정 사유를 입력해주세요. (예: 출퇴근 기록 누락, 시스템 오류 등)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              className="bg-[#fafbfb] border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>

          {/* 안내 메시지 */}
          <Alert className="bg-[#eff6ff] border-[#dbeafe]">
            <AlertCircle className="h-4 w-4 text-[#2563eb]" />
            <AlertDescription className="text-[#4a5568]">
              <ul className="text-sm space-y-1">
                <li>• 수정 후 지각, 조기퇴근, 초과근무가 자동으로 재계산됩니다.</li>
                <li>• 수정 이력은 시스템에 기록됩니다.</li>
                <li>• 시간 형식: HH:mm (예: 09:00, 18:30)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* 오류 메시지 */}
          {error && (
            <Alert className="bg-[#fef2f2] border-[#fecaca]">
              <AlertCircle className="h-4 w-4 text-[#dc2626]" />
              <AlertDescription className="text-[#dc2626]">{error}</AlertDescription>
            </Alert>
          )}

          {/* 이전 수정 이력 */}
          {record.is_modified && record.modified_at && (
            <Alert className="bg-[#f5f3ff] border-[#e9d5ff]">
              <AlertCircle className="h-4 w-4 text-[#7c3aed]" />
              <AlertDescription className="text-[#4a5568]">
                <p className="font-medium text-[#0a0b0c]">이전 수정 이력</p>
                <p className="text-sm">
                  {format(new Date(record.modified_at), "yy.M.d HH:mm", { locale: ko })}
                  {record.modified_by && ` - ${record.modified_by}`}
                </p>
                {record.modification_reason && (
                  <p className="text-sm">사유: {record.modification_reason}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
            {submitting ? "수정 중..." : "수정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
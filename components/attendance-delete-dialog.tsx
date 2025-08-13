"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import type { AttendanceDetail } from "@/types/attendance"

interface AttendanceDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AttendanceDetail
  onComplete: () => void
}

export function AttendanceDeleteDialog({
  open,
  onOpenChange,
  record,
  onComplete,
}: AttendanceDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatTime = (time?: string | null) => {
    if (!time) return "-"
    return time.slice(0, 5)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await supabaseAttendanceStorage.deleteAttendanceRecord(record.id)
      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("근태 삭제 오류:", error)
      setError(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-left text-[#0a0b0c]">
            근태 기록 삭제
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 삭제 경고 */}
          <Alert className="bg-[#fef2f2] border-[#fecaca]">
            <AlertCircle className="h-4 w-4 text-[#dc2626]" />
            <AlertDescription className="text-[#4a5568]">
              이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
            </AlertDescription>
          </Alert>

          {/* 삭제할 기록 정보 */}
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">출근</span>
              <span className="font-medium text-[#0a0b0c]">{formatTime(record.check_in_time)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">퇴근</span>
              <span className="font-medium text-[#0a0b0c]">{formatTime(record.check_out_time)}</span>
            </div>
          </div>

          {/* 추가 경고 메시지 */}
          <Alert className="bg-[#fff7ed] border-[#fed7aa]">
            <AlertCircle className="h-4 w-4 text-[#ea580c]" />
            <AlertDescription className="text-[#4a5568]">
              <ul className="text-sm space-y-1">
                <li>• 삭제된 근태 기록은 복구할 수 없습니다.</li>
                <li>• 관련된 모든 계산 결과가 사라집니다.</li>
                {record.is_modified && <li>• 수정 이력도 함께 삭제됩니다.</li>}
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
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={deleting}
            className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
          >
            취소
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={deleting}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
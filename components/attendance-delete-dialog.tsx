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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            근태 기록 삭제
          </DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 삭제할 기록 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">날짜</span>
              <span className="font-medium">
                {format(new Date(record.work_date), "yyyy년 M월 d일 (E)", { locale: ko })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">이름</span>
              <span className="font-medium">{record.member_name}</span>
            </div>
            {record.work_type_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">근무유형</span>
                <span
                  className="px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: record.work_type_bgcolor || "#e5e7eb",
                    color: record.work_type_fontcolor || "#000000",
                  }}
                >
                  {record.work_type_name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">출근</span>
              <span className="font-medium">{formatTime(record.check_in_time)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">퇴근</span>
              <span className="font-medium">{formatTime(record.check_out_time)}</span>
            </div>
          </div>

          {/* 경고 메시지 */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="text-sm space-y-1">
                <li>• 삭제된 근태 기록은 복구할 수 없습니다.</li>
                <li>• 관련된 모든 계산 결과가 사라집니다.</li>
                {record.is_modified && <li>• 수정 이력도 함께 삭제됩니다.</li>}
              </ul>
            </AlertDescription>
          </Alert>

          {/* 오류 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
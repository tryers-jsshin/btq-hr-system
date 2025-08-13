"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]

interface TerminationCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  onConfirm: (reason: string) => Promise<void>
}

export function TerminationCancelDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
}: TerminationCancelDialogProps) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return
    }

    setLoading(true)
    try {
      await onConfirm(reason)
      setReason("")
      onOpenChange(false)
    } catch (error) {
      console.error("퇴사 취소 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setReason("")
    onOpenChange(false)
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] !w-[calc(100%-2rem)] sm:w-full rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[#0a0b0c]">퇴사 취소</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 경고 메시지 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">주의사항</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>퇴사 취소 시 구성원이 활성 상태로 변경됩니다</li>
                <li>연차 및 관련 데이터가 복구되지 않을 수 있습니다</li>
                <li>필요시 연차를 수동으로 재조정해야 합니다</li>
              </ul>
            </div>
          </div>

          {/* 구성원 정보 */}
          <div className="bg-[#fafbfb] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#718096]">이름</span>
              <span className="text-[#0a0b0c] font-medium">{member.name}</span>
            </div>
            {member.employee_number && (
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">사번</span>
                <span className="text-[#0a0b0c]">{member.employee_number}</span>
              </div>
            )}
            {member.termination_date && (
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">퇴사일</span>
                <span className="text-[#0a0b0c]">
                  {new Date(member.termination_date).toLocaleDateString("ko-KR")}
                </span>
              </div>
            )}
          </div>

          {/* 취소 사유 입력 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-[#0a0b0c]">
              퇴사 취소 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="퇴사 취소 사유를 입력해주세요..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-sm"
              disabled={loading}
            />
            {!reason.trim() && (
              <p className="text-xs text-red-500">퇴사 취소 사유는 필수입니다</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
          >
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
          >
            {loading ? "처리 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
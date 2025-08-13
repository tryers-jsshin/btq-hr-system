"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle, XCircle, Users, CalendarDays, Clock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseAnnualLeaveStorageV2 } from "@/lib/supabase-annual-leave-storage-v2"
import type { LeaveRequest } from "@/types/leave-request"

interface LeaveApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequest
  action: "approve" | "reject"
  approverId: string
  onSubmit: () => void
}

// Linear Light 테마 색상 시스템
const statusColors = {
  "대기중": "text-[#ea580c]",
  "승인됨": "text-[#16a34a]", 
  "반려됨": "text-[#dc2626]",
  "취소됨": "text-[#64748b]",
}

const statusBadgeColors = {
  "대기중": "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
  "승인됨": "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]",
  "반려됨": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "취소됨": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
  "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  "특별휴가": "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  "병가": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "경조휴가": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

// 동적 휴가 유형 색상 처리
const getLeaveTypeColor = (leaveType: string) => {
  return leaveTypeColors[leaveType as keyof typeof leaveTypeColors] || "bg-[#fef3c7] text-[#d97706] border-[#fde68a]"
}

export function LeaveApprovalDialog({
  open,
  onOpenChange,
  request,
  action,
  approverId,
  onSubmit,
}: LeaveApprovalDialogProps) {
  const [rejectedReason, setRejectedReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberBalance, setMemberBalance] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      loadMemberBalance()
      setRejectedReason("")
      setError(null)
    }
  }, [open, request.member_id])

  const loadMemberBalance = async () => {
    try {
      const { currentBalance } = await supabaseAnnualLeaveStorageV2.calculateBalance(request.member_id)
      setMemberBalance(currentBalance)
    } catch (error) {
      console.error("잔여 연차 조회 오류:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (action === "approve") {
        // 승인 처리
        if (memberBalance !== null && memberBalance < request.total_days) {
          throw new Error(`잔여 연차(${memberBalance}일)가 부족합니다.`)
        }

        await supabaseLeaveRequestStorage.approveLeaveRequest({
          request_id: request.id,
          action: "approve",
          approved_by: approverId,
        })
      } else {
        // 반려 처리
        await supabaseLeaveRequestStorage.rejectLeaveRequest({
          request_id: request.id,
          rejected_reason: rejectedReason || undefined,
          rejected_by: approverId,
        })
      }

      onSubmit()
    } catch (error) {
      console.error("승인/반려 처리 오류:", error)
      setError(error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "yy.M.d(E)", { locale: ko })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일 HH:mm", { locale: ko })
  }

  const getActionColor = () => {
    return action === "approve" ? "text-green-600" : "text-red-600"
  }

  const getActionIcon = () => {
    return action === "approve" ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />
  }

  const getActionText = () => {
    return action === "approve" ? "승인" : "반려"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader className="text-left space-y-0 pb-2">
          <DialogTitle className={`flex items-center gap-3 text-xl font-bold ${getActionColor()}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              action === "approve" 
                ? "bg-[#f0fdf4] text-[#16a34a]" 
                : "bg-[#fef2f2] text-[#dc2626]"
            }`}>
              {getActionIcon()}
            </div>
            연차 {getActionText()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 신청 정보 - Version 6 스타일 */}
          <div className="p-4 bg-[#fafbfb] rounded-lg border border-[#f3f4f6]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#0a0b0c]">{request.member_name}</span>
                  <span className="text-sm text-[#718096]">• {request.team_name}</span>
                </div>
                <Badge className={`text-xs ${getLeaveTypeColor(request.leave_type)}`} variant="outline">
                  {request.leave_type}
                </Badge>
              </div>
              <div className="text-sm text-[#4a5568]">
                {request.start_date === request.end_date
                  ? formatDate(request.start_date)
                  : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                } / {request.total_days}일
              </div>
              {request.reason && (
                <div className="text-xs text-[#718096]">
                  {request.reason}
                </div>
              )}
              <div className="text-xs text-[#718096] pt-1">
                신청일: {formatDateTime(request.requested_at)}
              </div>
            </div>
          </div>

          {/* 잔여 연차 정보 */}
          {memberBalance !== null && (
            <div className="p-4 bg-[#eff6ff] border border-[#dbeafe] rounded-lg">
              <div className="text-sm font-medium text-[#0a0b0c]">
                {request.member_name}님의 잔여 연차: <span className="text-lg font-bold text-[#2563eb]">{memberBalance}일</span>
              </div>
              {action === "approve" && memberBalance < request.total_days && (
                <div className="mt-2 p-2 bg-[#fef2f2] border border-[#fecaca] rounded text-sm text-[#dc2626]">
                  ⚠️ 잔여 연차가 부족합니다! (필요: {request.total_days}일)
                </div>
              )}
            </div>
          )}


          {/* 반려 사유 입력 */}
          {action === "reject" && (
            <div className="space-y-3">
              <Label htmlFor="rejected-reason" className="text-sm font-medium text-[#0a0b0c]">
                반려 사유 (선택)
              </Label>
              <Textarea
                id="rejected-reason"
                value={rejectedReason}
                onChange={(e) => setRejectedReason(e.target.value)}
                placeholder="반료 사유를 입력하세요 (선택사항)"
                rows={3}
                className="bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] placeholder:text-[#718096]"
              />
            </div>
          )}

          <DialogFooter className="!flex !flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] hover:border-[#e5e7eb]"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || (action === "approve" && memberBalance !== null && memberBalance < request.total_days)}
              className={`flex-1 ${
                action === "approve" 
                  ? "bg-[#16a34a] hover:bg-[#15803d] text-white" 
                  : "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              }`}
            >
              {loading 
                ? `${getActionText()} 처리 중...` 
                : `${getActionText()}하기`
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
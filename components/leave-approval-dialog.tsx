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
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import type { LeaveRequest } from "@/types/leave-request"

interface LeaveApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequest
  action: "approve" | "reject"
  approverId: string
  onSubmit: () => void
}

const statusColors = {
  "대기중": "bg-yellow-100 text-yellow-800",
  "승인됨": "bg-green-100 text-green-800",
  "반려됨": "bg-red-100 text-red-800",
  "취소됨": "bg-gray-100 text-gray-800",
}

const leaveTypeColors = {
  "연차": "bg-blue-100 text-blue-800",
  "오전반차": "bg-purple-100 text-purple-800",
  "오후반차": "bg-indigo-100 text-indigo-800",
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
      const balance = await supabaseAnnualLeaveStorage.getBalanceByMemberId(request.member_id)
      setMemberBalance(balance?.current_balance || 0)
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
    return format(new Date(dateString), "yyyy년 M월 d일 (E)", { locale: ko })
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${getActionColor()}`}>
            {getActionIcon()}
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

          {/* 신청 정보 */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">{request.member_name}</span>
              {request.team_name && (
                <span className="text-gray-600">({request.team_name})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge className={leaveTypeColors[request.leave_type]}>
                {request.leave_type}
              </Badge>
              <Badge className={statusColors[request.status]}>
                {request.status}
              </Badge>
              <span className="text-sm font-medium">
                {request.total_days}일
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {request.start_date === request.end_date
                    ? formatDate(request.start_date)
                    : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                  }
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>신청일: {formatDateTime(request.requested_at)}</span>
              </div>

              {request.reason && (
                <div className="text-sm">
                  <span className="font-medium">사유:</span> {request.reason}
                </div>
              )}
            </div>
          </div>

          {/* 잔여 연차 정보 */}
          {memberBalance !== null && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                현재 잔여 연차: <span className="text-lg font-bold">{memberBalance}일</span>
              </div>
              {action === "approve" && memberBalance < request.total_days && (
                <div className="mt-1 text-sm text-red-600">
                  ⚠️ 잔여 연차가 부족합니다! (필요: {request.total_days}일)
                </div>
              )}
            </div>
          )}

          {/* 승인 확인 메시지 */}
          {action === "approve" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                이 연차를 승인하시겠습니까? 승인 시 다음이 자동으로 처리됩니다:
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 연차 {request.total_days}일 차감</li>
                  <li>• 근무표에 연차 반영</li>
                  <li>• 승인 이력 기록</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 반려 사유 입력 */}
          {action === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejected-reason">반려 사유 (선택)</Label>
              <Textarea
                id="rejected-reason"
                value={rejectedReason}
                onChange={(e) => setRejectedReason(e.target.value)}
                placeholder="반려 사유를 입력하세요 (선택사항)"
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || (action === "approve" && memberBalance !== null && memberBalance < request.total_days)}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
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
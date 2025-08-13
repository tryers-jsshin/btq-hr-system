"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Clock, User } from "lucide-react"
import { supabaseWorkMileageStorage } from "@/lib/supabase-work-mileage-storage"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface MileageAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  currentBalance: number
  onComplete: () => void
  adjustedBy: string
}

interface AdminAdjustmentHistory {
  id: string
  work_date: string
  minutes: number
  reason: string
  created_by: string
  created_at: string
}

export function MileageAdjustDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  currentBalance,
  onComplete,
  adjustedBy,
}: MileageAdjustDialogProps) {
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add")
  const [minutes, setMinutes] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdminAdjustmentHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 다이얼로그 열릴 때 초기화 및 조정 내역 로드
  useEffect(() => {
    if (open) {
      setAdjustType("add")
      setMinutes("")
      setReason("")
      setError(null)
      loadAdjustmentHistory()
    }
  }, [open, memberId])

  const loadAdjustmentHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from("work_mileage_transactions")
        .select("id, work_date, minutes, reason, created_by, created_at")
        .eq("member_id", memberId)
        .eq("transaction_type", "admin_adjust")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setAdjustmentHistory(data || [])
    } catch (error) {
      console.error("Error loading adjustment history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatMinutes = (mins: number) => {
    if (mins === 0) return "0분"
    const hours = Math.floor(Math.abs(mins) / 60)
    const minutes = Math.abs(mins) % 60
    if (hours === 0) return `${minutes}분`
    if (minutes === 0) return `${hours}시간`
    return `${hours}시간 ${minutes}분`
  }

  const handleSubmit = async () => {
    // 유효성 검사
    const minutesValue = parseInt(minutes)
    if (isNaN(minutesValue) || minutesValue <= 0) {
      setError("유효한 시간을 입력해주세요.")
      return
    }

    if (!reason.trim()) {
      setError("조정 사유를 입력해주세요.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const adjustedMinutes = adjustType === "subtract" ? -minutesValue : minutesValue
      
      await supabaseWorkMileageStorage.createAdminAdjustment({
        memberId,
        minutes: adjustedMinutes,
        reason: reason.trim(),
        createdBy: adjustedBy,
      })

      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("마일리지 조정 오류:", error)
      setError(error instanceof Error ? error.message : "조정 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const previewBalance = () => {
    const minutesValue = parseInt(minutes) || 0
    const adjustedMinutes = adjustType === "subtract" ? -minutesValue : minutesValue
    return currentBalance + adjustedMinutes
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-left text-[#0a0b0c]">
            근무 마일리지 조정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 대상 정보 */}
          <div className="bg-[#fafbfb] rounded-lg p-4 space-y-2 border border-[#f3f4f6]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">대상</span>
              <span className="font-medium text-[#0a0b0c]">{memberName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#718096]">현재 잔액</span>
              <span className={`font-medium ${
                currentBalance >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
              }`}>
                {currentBalance >= 0 ? "+" : ""}{formatMinutes(currentBalance)}
              </span>
            </div>
          </div>

          {/* 이전 조정 내역 */}
          {adjustmentHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#0a0b0c]">최근 조정 내역</Label>
              <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {loadingHistory ? (
                  <div className="text-center text-sm text-[#718096]">로딩 중...</div>
                ) : (
                  adjustmentHistory.map((history) => (
                    <div key={history.id} className="text-sm border-b border-[#dbeafe] last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-[#2563eb]" />
                          <span className="text-[#718096]">
                            {format(new Date(history.created_at), "yy.M.d HH:mm", { locale: ko })}
                          </span>
                        </div>
                        <span className={`font-medium ${
                          history.minutes >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
                        }`}>
                          {history.minutes >= 0 ? "+" : ""}{formatMinutes(history.minutes)}
                        </span>
                      </div>
                      <div className="text-[#4a5568] mt-1 pl-5">
                        {history.reason}
                      </div>
                      <div className="flex items-center gap-1 mt-1 pl-5">
                        <User className="h-3 w-3 text-[#94a3b8]" />
                        <span className="text-xs text-[#94a3b8]">
                          조정자: {history.created_by}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 조정 유형 */}
          <div className="space-y-2">
            <Label className="text-[#0a0b0c]">조정 유형</Label>
            <RadioGroup value={adjustType} onValueChange={(v) => setAdjustType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add" className="text-[#5e6ad2] border-[#cbd5e1]" />
                <Label htmlFor="add" className="font-normal cursor-pointer text-[#4a5568]">
                  추가 (+)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="subtract" id="subtract" className="text-[#5e6ad2] border-[#cbd5e1]" />
                <Label htmlFor="subtract" className="font-normal cursor-pointer text-[#4a5568]">
                  차감 (-)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 조정 시간 */}
          <div className="space-y-2">
            <Label htmlFor="minutes" className="text-[#0a0b0c]">조정 시간 (분)</Label>
            <Input
              id="minutes"
              type="number"
              placeholder="60"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              disabled={submitting}
              min="1"
              className="bg-[#fafbfb] border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
            <p className="text-xs text-[#718096]">
              예: 60 = 1시간, 90 = 1시간 30분
            </p>
          </div>

          {/* 조정 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-[#0a0b0c]">
              조정 사유 <span className="text-[#dc2626]">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="조정 사유를 입력해주세요. (예: 2024년 상반기 미반영 초과근무)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              className="bg-[#fafbfb] border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>

          {/* 예상 잔액 */}
          {minutes && (
            <Alert className="bg-[#eff6ff] border-[#dbeafe]">
              <AlertCircle className="h-4 w-4 text-[#2563eb]" />
              <AlertDescription className="text-[#4a5568]">
                <div className="flex items-center justify-between">
                  <span>조정 후 예상 잔액:</span>
                  <span className={`font-medium ${
                    previewBalance() >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
                  }`}>
                    {previewBalance() >= 0 ? "+" : ""}{formatMinutes(previewBalance())}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

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
            {submitting ? "조정 중..." : "조정 적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
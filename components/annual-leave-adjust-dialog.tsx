"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Minus, AlertTriangle } from "lucide-react"
import type { AnnualLeaveBalance } from "@/types/annual-leave"

interface AnnualLeaveAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: AnnualLeaveBalance | null
  adjustType: "add" | "subtract"
  onSave: (data: {
    memberId: string
    memberName: string
    amount: number
    reason: string
  }) => void
}

export function AnnualLeaveAdjustDialog({
  open,
  onOpenChange,
  balance,
  adjustType,
  onSave,
}: AnnualLeaveAdjustDialogProps) {
  const [formData, setFormData] = useState({
    amount: 1,
    reason: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (open) {
      setFormData({
        amount: 1,
        reason: "",
      })
      setErrors({})
    }
  }, [open])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (formData.amount <= 0) {
      newErrors.amount = "조정 일수는 1일 이상이어야 합니다"
    }

    if (adjustType === "subtract" && balance && formData.amount > balance.current_balance) {
      newErrors.amount = `차감할 수 있는 최대 일수는 ${balance.current_balance}일입니다`
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "조정 사유를 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !balance) return

    const amount = adjustType === "add" ? formData.amount : -formData.amount

    onSave({
      memberId: balance.member_id,
      memberName: balance.member_name,
      amount,
      reason: formData.reason,
    })

    onOpenChange(false)
  }

  if (!balance) return null

  const isSubtract = adjustType === "subtract"
  const title = isSubtract ? "연차 차감" : "연차 추가"
  const icon = isSubtract ? <Minus className="h-5 w-5 text-red-600" /> : <Plus className="h-5 w-5 text-green-600" />
  const buttonColor = isSubtract ? "destructive" : "default"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {icon}
            <span className="ml-2">
              {balance.member_name}님 {title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 현재 잔액 표시 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">현재 연차 잔액</div>
            <div className="text-2xl font-bold text-gray-900">{balance.current_balance}일</div>
          </div>

          {/* 조정 일수 */}
          <div className="space-y-2">
            <Label htmlFor="amount">{title} 일수</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={isSubtract ? balance.current_balance : undefined}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number.parseInt(e.target.value) || 1 }))}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          {/* 조정 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">조정 사유</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="연차 조정 사유를 입력하세요"
              className={errors.reason ? "border-red-500" : ""}
              rows={3}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
          </div>

          {/* 결과 미리보기 */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>조정 후 잔액:</strong>{" "}
              {balance.current_balance + (isSubtract ? -formData.amount : formData.amount)}일
            </div>
          </div>

          {/* 경고 메시지 */}
          {isSubtract && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>연차를 차감하면 되돌릴 수 없습니다. 신중하게 진행해주세요.</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant={buttonColor}>
              {title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Minus, AlertTriangle, Calendar } from "lucide-react"
import type { AnnualLeaveBalance } from "@/types/annual-leave"

interface AnnualLeaveAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: AnnualLeaveBalance | null
  adjustType: "grant" | "expire"
  onSave: (data: {
    memberId: string
    memberName: string
    amount: number
    reason: string
    expireDays?: number
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
    expireDays: 365,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (open) {
      setFormData({
        amount: 1,
        reason: "",
        expireDays: 365,
      })
      setErrors({})
    }
  }, [open])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (formData.amount <= 0) {
      newErrors.amount = "조정 일수는 1일 이상이어야 합니다"
    }

    if (adjustType === "expire" && balance && formData.amount > balance.current_balance) {
      newErrors.amount = `차감할 수 있는 최대 일수는 ${balance.current_balance}일입니다`
    }
    
    if (adjustType === "grant" && formData.expireDays <= 0) {
      newErrors.expireDays = "소멸 기간은 1일 이상이어야 합니다"
    }

    if (!formData.reason.trim()) {
      newErrors.reason = adjustType === "grant" ? "부여 사유를 입력해주세요" : "차감 사유를 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !balance) return

    const amount = adjustType === "grant" ? formData.amount : -formData.amount

    onSave({
      memberId: balance.member_id,
      memberName: balance.member_name,
      amount,
      reason: formData.reason,
      expireDays: adjustType === "grant" ? formData.expireDays : undefined,
    })

    onOpenChange(false)
  }

  if (!balance) return null

  const isExpire = adjustType === "expire"
  const title = isExpire ? "연차 차감" : "연차 부여"
  const icon = isExpire ? <Minus className="h-5 w-5 text-red-600" /> : <Plus className="h-5 w-5 text-green-600" />
  const buttonColor = isExpire ? "destructive" : "default"

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

          {/* 부여/소멸 일수 */}
          <div className="space-y-2">
            <Label htmlFor="amount">{title} 일수</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={isExpire ? balance.current_balance : undefined}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number.parseInt(e.target.value) || 1 }))}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>
          
          {/* 소멸 기간 (부여 시만) */}
          {adjustType === "grant" && (
            <div className="space-y-2">
              <Label htmlFor="expireDays">
                <Calendar className="inline h-4 w-4 mr-1" />
                소멸 기간 (일)
              </Label>
              <Input
                id="expireDays"
                type="number"
                min="1"
                value={formData.expireDays}
                onChange={(e) => setFormData((prev) => ({ ...prev, expireDays: Number.parseInt(e.target.value) || 365 }))}
                className={errors.expireDays ? "border-red-500" : ""}
              />
              {errors.expireDays && <p className="text-sm text-red-500">{errors.expireDays}</p>}
              <p className="text-xs text-gray-500">
                부여일로부터 {formData.expireDays}일 후 자동 소멸 (예: 365일 = 1년)
              </p>
            </div>
          )}

          {/* 부여/차감 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{adjustType === "grant" ? "부여" : "차감"} 사유</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={adjustType === "grant" ? "연차 부여 사유를 입력하세요 (예: 관리자 수동 부여)" : "연차 차감 사유를 입력하세요 (예: 부여 취소)"}
              className={errors.reason ? "border-red-500" : ""}
              rows={3}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
          </div>

          {/* 결과 미리보기 */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700 space-y-1">
              <div>
                <strong>현재 잔액:</strong> {balance.current_balance}일
              </div>
              <div>
                <strong>{title}:</strong> {formData.amount}일
              </div>
              <div>
                <strong>처리 후 잔액:</strong>{" "}
                {balance.current_balance + (isExpire ? -formData.amount : formData.amount)}일
              </div>
              {adjustType === "grant" && (
                <div className="text-xs text-blue-600 mt-2">
                  → 부여일: 오늘, 소멸 예정일: {new Date(Date.now() + formData.expireDays * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>

          {/* 경고 메시지 */}
          {isExpire && (
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

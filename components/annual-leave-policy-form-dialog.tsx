"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"
import type { AnnualLeavePolicy } from "@/types/annual-leave"

interface AnnualLeavePolicyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy?: AnnualLeavePolicy | null
  onSave: (data: Omit<AnnualLeavePolicy, "id" | "created_at" | "updated_at">) => void
}

export function AnnualLeavePolicyFormDialog({ open, onOpenChange, policy, onSave }: AnnualLeavePolicyFormDialogProps) {
  const [formData, setFormData] = useState({
    policy_name: "",
    description: "",
    is_active: true,
    first_year_monthly_grant: 1,
    first_year_max_days: 11,
    base_annual_days: 15,
    increment_years: 2,
    increment_days: 1,
    max_annual_days: 25,
    expire_after_months: 12,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (policy) {
      setFormData({
        policy_name: policy.policy_name,
        description: policy.description || "",
        is_active: policy.is_active,
        first_year_monthly_grant: policy.first_year_monthly_grant,
        first_year_max_days: policy.first_year_max_days,
        base_annual_days: policy.base_annual_days,
        increment_years: policy.increment_years,
        increment_days: policy.increment_days,
        max_annual_days: policy.max_annual_days,
        expire_after_months: policy.expire_after_months,
      })
    } else {
      setFormData({
        policy_name: "",
        description: "",
        is_active: true,
        first_year_monthly_grant: 1,
        first_year_max_days: 11,
        base_annual_days: 15,
        increment_years: 2,
        increment_days: 1,
        max_annual_days: 25,
        expire_after_months: 12,
      })
    }
    setErrors({})
  }, [policy, open])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.policy_name.trim()) {
      newErrors.policy_name = "정책명을 입력해주세요"
    }

    if (formData.first_year_monthly_grant < 1) {
      newErrors.first_year_monthly_grant = "월별 부여 일수는 1일 이상이어야 합니다"
    }

    if (formData.first_year_max_days < 1) {
      newErrors.first_year_max_days = "첫 해 최대 연차는 1일 이상이어야 합니다"
    }

    if (formData.base_annual_days < 1) {
      newErrors.base_annual_days = "기본 연차는 1일 이상이어야 합니다"
    }

    if (formData.increment_years < 1) {
      newErrors.increment_years = "증가 주기는 1년 이상이어야 합니다"
    }

    if (formData.increment_days < 1) {
      newErrors.increment_days = "증가 일수는 1일 이상이어야 합니다"
    }

    if (formData.max_annual_days < formData.base_annual_days) {
      newErrors.max_annual_days = "최대 연차는 기본 연차보다 크거나 같아야 합니다"
    }

    if (formData.expire_after_months < 1) {
      newErrors.expire_after_months = "소멸 기간은 1개월 이상이어야 합니다"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            {policy ? "연차 정책 수정" : "연차 정책 추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="policy_name">정책명</Label>
                <Input
                  id="policy_name"
                  value={formData.policy_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, policy_name: e.target.value }))}
                  placeholder="예: 기본 연차 정책"
                  className={errors.policy_name ? "border-red-500" : ""}
                />
                {errors.policy_name && <p className="text-sm text-red-500">{errors.policy_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="정책에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">활성화</Label>
              </div>
            </CardContent>
          </Card>

          {/* 1단계: 입사 첫 해 정책 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1단계: 입사 첫 해 정책</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_year_monthly_grant">월별 부여 일수</Label>
                  <Input
                    id="first_year_monthly_grant"
                    type="number"
                    min="1"
                    value={formData.first_year_monthly_grant}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_year_monthly_grant: Number.parseInt(e.target.value) || 1,
                      }))
                    }
                    className={errors.first_year_monthly_grant ? "border-red-500" : ""}
                  />
                  {errors.first_year_monthly_grant && (
                    <p className="text-sm text-red-500">{errors.first_year_monthly_grant}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_year_max_days">첫 해 최대 연차</Label>
                  <Input
                    id="first_year_max_days"
                    type="number"
                    min="1"
                    value={formData.first_year_max_days}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, first_year_max_days: Number.parseInt(e.target.value) || 11 }))
                    }
                    className={errors.first_year_max_days ? "border-red-500" : ""}
                  />
                  {errors.first_year_max_days && <p className="text-sm text-red-500">{errors.first_year_max_days}</p>}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p>
                  <strong>예시:</strong> 7월 10일 입사 시
                </p>
                <p>• 8월 10일: {formData.first_year_monthly_grant}일 부여</p>
                <p>• 9월 10일: {formData.first_year_monthly_grant}일 부여</p>
                <p>• ... (최대 {formData.first_year_max_days}일까지)</p>
                <p>• 다음해 7월 10일: 모든 미사용 연차 소멸</p>
              </div>
            </CardContent>
          </Card>

          {/* 2단계: 입사 1년 이후 정책 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2단계: 입사 1년 이후 정책</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_annual_days">기본 연차 일수</Label>
                  <Input
                    id="base_annual_days"
                    type="number"
                    min="1"
                    value={formData.base_annual_days}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, base_annual_days: Number.parseInt(e.target.value) || 15 }))
                    }
                    className={errors.base_annual_days ? "border-red-500" : ""}
                  />
                  {errors.base_annual_days && <p className="text-sm text-red-500">{errors.base_annual_days}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_annual_days">최대 연차 일수</Label>
                  <Input
                    id="max_annual_days"
                    type="number"
                    min="1"
                    value={formData.max_annual_days}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, max_annual_days: Number.parseInt(e.target.value) || 25 }))
                    }
                    className={errors.max_annual_days ? "border-red-500" : ""}
                  />
                  {errors.max_annual_days && <p className="text-sm text-red-500">{errors.max_annual_days}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="increment_years">증가 주기 (년)</Label>
                  <Input
                    id="increment_years"
                    type="number"
                    min="1"
                    value={formData.increment_years}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, increment_years: Number.parseInt(e.target.value) || 2 }))
                    }
                    className={errors.increment_years ? "border-red-500" : ""}
                  />
                  {errors.increment_years && <p className="text-sm text-red-500">{errors.increment_years}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="increment_days">증가 일수</Label>
                  <Input
                    id="increment_days"
                    type="number"
                    min="1"
                    value={formData.increment_days}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, increment_days: Number.parseInt(e.target.value) || 1 }))
                    }
                    className={errors.increment_days ? "border-red-500" : ""}
                  />
                  {errors.increment_days && <p className="text-sm text-red-500">{errors.increment_days}</p>}
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <p>
                  <strong>연차 증가 예시:</strong>
                </p>
                <p>• 1년차: {formData.base_annual_days}일</p>
                <p>• 2년차: {formData.base_annual_days}일</p>
                <p>• 3년차: {formData.base_annual_days + formData.increment_days}일</p>
                <p>• 5년차: {formData.base_annual_days + formData.increment_days * 2}일</p>
                <p>• ... (최대 {formData.max_annual_days}일)</p>
              </div>
            </CardContent>
          </Card>

          {/* 소멸 정책 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">소멸 정책</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expire_after_months">소멸 기간 (개월)</Label>
                <Input
                  id="expire_after_months"
                  type="number"
                  min="1"
                  value={formData.expire_after_months}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expire_after_months: Number.parseInt(e.target.value) || 12 }))
                  }
                  className={errors.expire_after_months ? "border-red-500" : ""}
                />
                {errors.expire_after_months && <p className="text-sm text-red-500">{errors.expire_after_months}</p>}
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                <p>
                  <strong>소멸 규칙:</strong>
                </p>
                <p>• 부여일 기준 {formData.expire_after_months}개월 후 소멸</p>
                <p>• 예: 2024년 7월 31일 부여 → 2025년 7월 30일 소멸</p>
                <p>• 입사 첫 해는 입사 1년 되는 날 모든 연차 소멸</p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">{policy ? "수정" : "저장"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

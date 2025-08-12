"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Palette } from "lucide-react"
import type { WorkTypeType } from "@/types/work-type"

interface WorkTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workType?: WorkTypeType | null
  onSave: (data: Omit<WorkTypeType, "id" | "created_at" | "updated_at">) => void
  isLeaveType?: boolean
}

// 색상 프리셋
const COLOR_PRESETS = [
  { name: "파란색", bgcolor: "#3b82f6", fontcolor: "#ffffff" },
  { name: "초록색", bgcolor: "#10b981", fontcolor: "#ffffff" },
  { name: "보라색", bgcolor: "#8b5cf6", fontcolor: "#ffffff" },
  { name: "빨간색", bgcolor: "#ef4444", fontcolor: "#ffffff" },
  { name: "주황색", bgcolor: "#f97316", fontcolor: "#ffffff" },
  { name: "회색", bgcolor: "#6b7280", fontcolor: "#ffffff" },
]

export function WorkTypeFormDialog({ open, onOpenChange, workType, onSave, isLeaveType = false }: WorkTypeFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
    bgcolor: "#3b82f6",
    fontcolor: "#ffffff",
    deduction_days: 1.0,
    is_holiday: false,
  })
  const [isFullDay, setIsFullDay] = useState(true) // 종일 휴가 여부
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (workType) {
      const isWorkTypeFullDay = workType.start_time === "00:00:00" && workType.end_time === "23:59:59"
      setFormData({
        name: workType.name,
        start_time: workType.start_time,
        end_time: workType.end_time,
        bgcolor: workType.bgcolor,
        fontcolor: workType.fontcolor,
        deduction_days: workType.deduction_days || (isLeaveType ? 1.0 : 0),
        is_holiday: workType.is_holiday || false,
      })
      setIsFullDay(isLeaveType ? isWorkTypeFullDay : false)
    } else {
      setFormData({
        name: "",
        start_time: isLeaveType ? "00:00:00" : "",
        end_time: isLeaveType ? "23:59:59" : "",
        bgcolor: "#3b82f6",
        fontcolor: "#ffffff",
        deduction_days: isLeaveType ? 1.0 : 0,
        is_holiday: false,
      })
      setIsFullDay(isLeaveType)
    }
    setErrors({})
  }, [workType, open, isLeaveType])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = `${isLeaveType ? '휴가' : '근무'} 유형명을 입력해주세요`
    }

    // 휴가 유형인 경우 연차 차감량 검증
    if (isLeaveType) {
      if (formData.deduction_days <= 0) {
        newErrors.deduction_days = "연차 차감량은 0보다 커야 합니다"
      }
      if (formData.deduction_days > 10) {
        newErrors.deduction_days = "연차 차감량은 10일을 초과할 수 없습니다"
      }
    }

    // 휴가 유형이 아니거나, 휴가 유형이지만 시간 지정인 경우 시간 검증
    if (!isLeaveType || (isLeaveType && !isFullDay)) {
      if (!formData.start_time) {
        newErrors.start_time = "시작 시간을 선택해주세요"
      }

      if (!formData.end_time) {
        newErrors.end_time = "종료 시간을 선택해주세요"
      }

      if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
        newErrors.end_time = "종료 시간은 시작 시간보다 늦어야 합니다"
      }
    }

    // Hex 색상 형식 검증
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    if (!hexPattern.test(formData.bgcolor)) {
      newErrors.bgcolor = "올바른 hex 색상 형식을 입력해주세요 (예: #3b82f6)"
    }

    if (!hexPattern.test(formData.fontcolor)) {
      newErrors.fontcolor = "올바른 hex 색상 형식을 입력해주세요 (예: #ffffff)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // 제출 데이터 준비
    let submitData: any = { ...formData }
    
    // is_leave 필드 설정
    submitData.is_leave = isLeaveType
    
    // 휴가 유형이면서 종일인 경우 시간을 기본값으로 설정
    if (isLeaveType && isFullDay) {
      submitData.start_time = "00:00:00"
      submitData.end_time = "23:59:59"
    }
    
    // 일반 근무 유형인 경우
    if (!isLeaveType) {
      // deduction_days를 undefined로 설정
      submitData = { ...submitData, deduction_days: undefined }
      // 휴무일이면 시간을 하루 종일로 설정 (이미 체크박스 변경 시 설정되지만 확실하게)
      if (submitData.is_holiday) {
        submitData.start_time = "00:00:00"
        submitData.end_time = "23:59:59"
      }
    }

    onSave(submitData)
    onOpenChange(false)
  }

  const handlePresetClick = (preset: (typeof COLOR_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      bgcolor: preset.bgcolor,
      fontcolor: preset.fontcolor,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workType ? 
              `${isLeaveType ? '휴가' : '근무'} 유형 수정` : 
              `${isLeaveType ? '휴가' : '근무'} 유형 추가`
            }
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
                <Label htmlFor="name">{isLeaveType ? '휴가' : '근무'} 유형명</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isLeaveType ? "예: 연차, 오전반차, 오후반차" : "예: 정시, 오픈, 마감"}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              {isLeaveType && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deduction_days">연차 차감량</Label>
                    <Input
                      id="deduction_days"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={formData.deduction_days}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deduction_days: parseFloat(e.target.value) || 0 }))}
                      placeholder="예: 1 (종일), 0.5 (반차)"
                      className={errors.deduction_days ? "border-red-500" : ""}
                    />
                    {errors.deduction_days && <p className="text-sm text-red-500">{errors.deduction_days}</p>}
                    <p className="text-sm text-gray-500">
                      이 휴가 유형을 사용할 때 차감될 연차 일수를 입력하세요 (예: 1일, 0.5일)
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="fullday-switch">종일 휴가</Label>
                      <p className="text-sm text-gray-500">
                        종일 휴가가 아니면 시간을 지정할 수 있습니다
                      </p>
                    </div>
                    <Switch
                      id="fullday-switch"
                      checked={isFullDay}
                      onCheckedChange={setIsFullDay}
                    />
                  </div>

                  {!isFullDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_time">시작 시간</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                          className={errors.start_time ? "border-red-500" : ""}
                        />
                        {errors.start_time && <p className="text-sm text-red-500">{errors.start_time}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_time">종료 시간</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                          className={errors.end_time ? "border-red-500" : ""}
                        />
                        {errors.end_time && <p className="text-sm text-red-500">{errors.end_time}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isLeaveType && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">시작 시간</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        className={errors.start_time ? "border-red-500" : ""}
                        disabled={formData.is_holiday}
                      />
                      {errors.start_time && <p className="text-sm text-red-500">{errors.start_time}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_time">종료 시간</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                        className={errors.end_time ? "border-red-500" : ""}
                        disabled={formData.is_holiday}
                      />
                      {errors.end_time && <p className="text-sm text-red-500">{errors.end_time}</p>}
                    </div>
                  </div>
                  
                  {/* 휴무일 체크박스 */}
                  <div className="flex items-center space-x-2 pt-4">
                    <input
                      type="checkbox"
                      id="is_holiday"
                      checked={formData.is_holiday}
                      onChange={(e) => {
                        const isHoliday = e.target.checked
                        setFormData((prev) => ({ 
                          ...prev, 
                          is_holiday: isHoliday,
                          // 휴무일이면 하루 종일로 자동 설정
                          start_time: isHoliday ? "00:00:00" : prev.start_time,
                          end_time: isHoliday ? "23:59:59" : prev.end_time
                        }))
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="is_holiday" className="text-sm font-medium">
                      휴무일 (오프, 공휴일 등)
                    </Label>
                    <span className="text-xs text-gray-500">
                      - 연차 계산에서 제외됩니다
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 색상 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                뱃지 색상 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 색상 프리셋 */}
              <div className="space-y-2">
                <Label>색상 프리셋</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="outline"
                      className="h-auto p-2 flex flex-col items-center space-y-1 bg-transparent"
                      onClick={() => handlePresetClick(preset)}
                    >
                      <Badge style={{ backgroundColor: preset.bgcolor, color: preset.fontcolor }}>{preset.name}</Badge>
                      <span className="text-xs text-gray-500">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 직접 색상 입력 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bgcolor">배경색</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="bgcolor-picker"
                      type="color"
                      value={formData.bgcolor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bgcolor: e.target.value }))}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      id="bgcolor"
                      value={formData.bgcolor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bgcolor: e.target.value }))}
                      placeholder="#3b82f6"
                      className={`flex-1 ${errors.bgcolor ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.bgcolor && <p className="text-sm text-red-500">{errors.bgcolor}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontcolor">글자색</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="fontcolor-picker"
                      type="color"
                      value={formData.fontcolor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fontcolor: e.target.value }))}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      id="fontcolor"
                      value={formData.fontcolor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fontcolor: e.target.value }))}
                      placeholder="#ffffff"
                      className={`flex-1 ${errors.fontcolor ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.fontcolor && <p className="text-sm text-red-500">{errors.fontcolor}</p>}
                </div>
              </div>

              {/* 미리보기 */}
              <div className="space-y-2">
                <Label>미리보기</Label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Badge style={{ backgroundColor: formData.bgcolor, color: formData.fontcolor }}>
                    {formData.name || (isLeaveType ? "휴가 유형" : "근무 유형")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">{workType ? "수정" : "저장"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

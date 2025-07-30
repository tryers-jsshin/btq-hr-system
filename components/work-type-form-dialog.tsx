"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette } from "lucide-react"
import type { WorkTypeType } from "@/types/work-type"

interface WorkTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workType?: WorkTypeType | null
  onSave: (data: Omit<WorkTypeType, "id" | "created_at" | "updated_at">) => void
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

export function WorkTypeFormDialog({ open, onOpenChange, workType, onSave }: WorkTypeFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
    bgcolor: "#3b82f6",
    fontcolor: "#ffffff",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (workType) {
      setFormData({
        name: workType.name,
        start_time: workType.start_time,
        end_time: workType.end_time,
        bgcolor: workType.bgcolor,
        fontcolor: workType.fontcolor,
      })
    } else {
      setFormData({
        name: "",
        start_time: "",
        end_time: "",
        bgcolor: "#3b82f6",
        fontcolor: "#ffffff",
      })
    }
    setErrors({})
  }, [workType, open])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "근무 유형명을 입력해주세요"
    }

    if (!formData.start_time) {
      newErrors.start_time = "시작 시간을 선택해주세요"
    }

    if (!formData.end_time) {
      newErrors.end_time = "종료 시간을 선택해주세요"
    }

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = "종료 시간은 시작 시간보다 늦어야 합니다"
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

    onSave(formData)
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
          <DialogTitle>{workType ? "근무 유형 수정" : "근무 유형 추가"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">근무 유형명</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 정시, 오픈, 마감"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

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
                    {formData.name || "근무 유형"}
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

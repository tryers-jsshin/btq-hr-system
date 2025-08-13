"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { AlertCircle, CalendarIcon, UserX } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabaseTerminationStorage } from "@/lib/supabase-termination-storage"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]

interface TerminationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    memberId: string
    terminationDate: string
    terminationReason: string
  }) => void
}

export function TerminationFormDialog({ 
  open, 
  onOpenChange, 
  onSave 
}: TerminationFormDialogProps) {
  const [activeMembers, setActiveMembers] = useState<Member[]>([])
  const [formData, setFormData] = useState({
    memberId: "",
    terminationDate: "",
    terminationReason: "",
  })
  const [terminationDateObj, setTerminationDateObj] = useState<Date | undefined>()
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadActiveMembers()
      // 폼 초기화
      setFormData({
        memberId: "",
        terminationDate: "",
        terminationReason: "",
      })
      setTerminationDateObj(undefined)
      setErrors({})
    }
  }, [open])

  const loadActiveMembers = async () => {
    try {
      const members = await supabaseTerminationStorage.getActiveMembers()
      setActiveMembers(members)
    } catch (error) {
      console.error("활성 구성원 로드 실패:", error)
    }
  }

  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.memberId) {
      newErrors.memberId = "퇴사할 구성원을 선택해주세요"
    }

    if (!formData.terminationDate) {
      newErrors.terminationDate = "퇴사일을 선택해주세요"
    } else if (formData.memberId) {
      // 퇴사일 유효성 검사
      const validation = await supabaseTerminationStorage.validateTerminationDate(
        formData.memberId,
        formData.terminationDate,
      )
      if (!validation.isValid) {
        newErrors.terminationDate = validation.message
      }
    }

    if (!formData.terminationReason.trim()) {
      newErrors.terminationReason = "퇴사 사유를 입력해주세요"
    } else if (formData.terminationReason.length > 255) {
      newErrors.terminationReason = "퇴사 사유는 255자 이내로 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const isValid = await validateForm()
      if (!isValid) return

      onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("퇴사 등록 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setTerminationDateObj(date)
    if (date) {
      setFormData(prev => ({ 
        ...prev, 
        terminationDate: format(date, "yyyy-MM-dd") 
      }))
    }
  }

  const selectedMember = activeMembers.find((m) => m.id === formData.memberId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] !w-[calc(100%-2rem)] sm:w-full rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[#0a0b0c]">
            퇴사 처리
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* 경고 메시지 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">주의사항</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>퇴사 처리 시 해당 구성원의 상태가 변경됩니다</li>
                <li>연차 잔액이 자동으로 소멸 처리됩니다</li>
                <li>근무표에서 해당 구성원이 제외됩니다</li>
              </ul>
            </div>
          </div>

          {/* 구성원 선택 */}
          <div className="space-y-2">
            <Label htmlFor="member" className="text-sm font-medium text-[#0a0b0c]">
              퇴사할 구성원 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, memberId: value }))}
            >
              <SelectTrigger 
                className={cn(
                  "bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]",
                  errors.memberId && "border-red-500"
                )}
              >
                <SelectValue placeholder="구성원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {member.employee_number && (
                        <span className="text-[#718096] text-xs">({member.employee_number})</span>
                      )}
                      {member.team_name && (
                        <span className="text-[#718096] text-xs">- {member.team_name}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-xs text-red-500">{errors.memberId}</p>
            )}
          </div>

          {/* 선택된 구성원 정보 */}
          {selectedMember && (
            <div className="bg-[#fafbfb] rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">이름</span>
                <span className="text-[#0a0b0c] font-medium">{selectedMember.name}</span>
              </div>
              {selectedMember.team_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#718096]">소속팀</span>
                  <span className="text-[#0a0b0c]">{selectedMember.team_name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">입사일</span>
                <span className="text-[#0a0b0c]">
                  {new Date(selectedMember.join_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric"
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 퇴사일 */}
          <div className="space-y-2">
            <Label htmlFor="termination-date" className="text-sm font-medium text-[#0a0b0c]">
              퇴사일 <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white border-[#f3f4f6] hover:bg-[#fafbfb]",
                    !terminationDateObj && "text-[#718096]",
                    errors.terminationDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {terminationDateObj ? (
                    format(terminationDateObj, "yyyy년 MM월 dd일", { locale: ko })
                  ) : (
                    <span>퇴사일을 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={terminationDateObj}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={ko}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.terminationDate && (
              <p className="text-xs text-red-500">{errors.terminationDate}</p>
            )}
          </div>

          {/* 퇴사 사유 */}
          <div className="space-y-2">
            <Label htmlFor="termination-reason" className="text-sm font-medium text-[#0a0b0c]">
              퇴사 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="termination-reason"
              value={formData.terminationReason}
              onChange={(e) => setFormData((prev) => ({ ...prev, terminationReason: e.target.value }))}
              placeholder="퇴사 사유를 입력하세요..."
              className={cn(
                "min-h-[100px] bg-white border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-sm",
                errors.terminationReason && "border-red-500"
              )}
              maxLength={255}
            />
            <div className="flex justify-between items-center">
              {errors.terminationReason ? (
                <p className="text-xs text-red-500">{errors.terminationReason}</p>
              ) : (
                <span></span>
              )}
              <span className="text-xs text-[#718096]">
                {formData.terminationReason.length}/255
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "처리 중..." : "퇴사 처리"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserX, AlertTriangle } from "lucide-react"
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

export function TerminationFormDialog({ open, onOpenChange, onSave }: TerminationFormDialogProps) {
  const [activeMembers, setActiveMembers] = useState<Member[]>([])
  const [formData, setFormData] = useState({
    memberId: "",
    terminationDate: "",
    terminationReason: "",
  })
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

  const selectedMember = activeMembers.find((m) => m.id === formData.memberId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserX className="h-5 w-5 mr-2 text-red-600" />
            퇴사자 등록
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 경고 메시지 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>퇴사 처리 시 해당 구성원의 근무표가 자동으로 숨겨집니다.</AlertDescription>
          </Alert>

          {/* 구성원 선택 */}
          <div className="space-y-2">
            <Label>퇴사할 구성원</Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, memberId: value }))}
            >
              <SelectTrigger className={errors.memberId ? "border-red-500" : ""}>
                <SelectValue placeholder="구성원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.employee_number}) - {member.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && <p className="text-sm text-red-500">{errors.memberId}</p>}
          </div>

          {/* 선택된 구성원 정보 */}
          {selectedMember && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div>
                  <strong>이름:</strong> {selectedMember.name}
                </div>
                <div>
                  <strong>팀:</strong> {selectedMember.team_name}
                </div>
                <div>
                  <strong>입사일:</strong> {new Date(selectedMember.join_date).toLocaleDateString("ko-KR")}
                </div>
              </div>
            </div>
          )}

          {/* 퇴사일 */}
          <div className="space-y-2">
            <Label htmlFor="terminationDate">퇴사일</Label>
            <Input
              id="terminationDate"
              type="date"
              value={formData.terminationDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, terminationDate: e.target.value }))}
              className={errors.terminationDate ? "border-red-500" : ""}
              max={new Date().toISOString().split("T")[0]} // 오늘까지만 선택 가능
            />
            {errors.terminationDate && <p className="text-sm text-red-500">{errors.terminationDate}</p>}
          </div>

          {/* 퇴사 사유 */}
          <div className="space-y-2">
            <Label htmlFor="terminationReason">퇴사 사유</Label>
            <Textarea
              id="terminationReason"
              value={formData.terminationReason}
              onChange={(e) => setFormData((prev) => ({ ...prev, terminationReason: e.target.value }))}
              placeholder="퇴사 사유를 입력하세요"
              className={errors.terminationReason ? "border-red-500" : ""}
              maxLength={255}
              rows={3}
            />
            <div className="text-xs text-gray-500 text-right">{formData.terminationReason.length}/255</div>
            {errors.terminationReason && <p className="text-sm text-red-500">{errors.terminationReason}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              취소
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "처리 중..." : "퇴사 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
